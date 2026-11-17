"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { generateCode, shareUrl } from "@/lib/codes";
import { db } from "@/lib/db";
import { addUsage, analyzeGaps, answerStream, costUsd, prepare, recordAnswerUsage, sanitizeHistory } from "@/lib/donna";
import { getTimelineSteps, PROJECT_TEMPLATE, syncProjectsFromDocs, syncTimelineDoc } from "@/lib/generated";
import { importKnowledgeFolder, indexDoc, saveDoc, titleFromMarkdown } from "@/lib/knowledge";
import { getOwner } from "@/lib/owner";
import { defaultPrivacy, privacySchema, savePrivacy, type PrivacyContent } from "@/lib/privacy";
import { getLimits, limitsSchema, profileDataSchema, saveLimits, saveProfileData } from "@/lib/settings";

const DAY = 24 * 60 * 60 * 1000;

export type CreateLinkState = { error?: string; code?: string; url?: string; label?: string };

export async function createLink(_prev: CreateLinkState, formData: FormData): Promise<CreateLinkState> {
  await requireAdmin();
  const label = String(formData.get("label") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const days = Number(formData.get("days") ?? 7);
  if (!label) return { error: "Label is required." };
  if (!Number.isFinite(days) || days < 1 || days > 365) return { error: "Expiry must be 1–365 days." };
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateCode();
    const taken = await db.accessLink.findUnique({ where: { code } });
    if (taken) continue;
    await db.accessLink.create({
      data: { code, label, note: note || null, expiresAt: new Date(Date.now() + days * DAY) },
    });
    revalidatePath("/admin/links");
    return { code, url: shareUrl(code), label };
  }
  return { error: "Could not generate a unique code. Try again." };
}

export async function revokeLink(id: string) {
  await requireAdmin();
  await db.accessLink.update({ where: { id }, data: { revokedAt: new Date() } });
  revalidatePath("/admin/links");
}

export async function extendLink(id: string, days: number) {
  await requireAdmin();
  const link = await db.accessLink.findUniqueOrThrow({ where: { id } });
  const base = Math.max(link.expiresAt.getTime(), Date.now());
  await db.accessLink.update({ where: { id }, data: { expiresAt: new Date(base + days * DAY) } });
  revalidatePath("/admin/links");
}

export async function deleteLink(id: string) {
  await requireAdmin();
  await db.accessLink.delete({ where: { id } });
  revalidatePath("/admin/links");
}

export async function createDoc() {
  await requireAdmin();
  const { doc } = await saveDoc({ title: "Untitled document", content: "# Untitled document\n\n" });
  redirect(`/admin/knowledge/${doc.id}`);
}

export async function saveDocAction(input: { id: string; content: string }) {
  await requireAdmin();
  try {
    const existing = await db.knowledgeDoc.findUniqueOrThrow({ where: { id: input.id } });
    const title = titleFromMarkdown(input.content, existing.title).slice(0, 200);
    const { doc, changed } = await saveDoc({ id: input.id, title, content: input.content });
    if (changed || doc.indexStatus !== "READY") await indexDoc(doc.id);
    let warning: string | undefined;
    try {
      await syncProjectsFromDocs();
    } catch (error) {
      console.error("project sync failed", error);
      warning = `Saved, but the Projects page could not be updated: ${error instanceof Error ? error.message : String(error)}`;
    }
    const fresh = await db.knowledgeDoc.findUniqueOrThrow({ where: { id: doc.id } });
    revalidatePath("/");
    revalidatePath("/projects");
    revalidatePath("/admin/projects");
    revalidatePath("/admin/knowledge");
    revalidatePath(`/admin/knowledge/${doc.id}`);
    return { status: fresh.indexStatus, indexError: fresh.indexError, changed, title: fresh.title, warning };
  } catch (error) {
    console.error("save document failed", error);
    return { error: error instanceof Error ? error.message : "Save failed." };
  }
}

export async function deleteDoc(id: string) {
  await requireAdmin();
  await db.knowledgeDoc.delete({ where: { id } });
  await syncProjectsFromDocs();
  revalidatePath("/projects");
  revalidatePath("/admin/knowledge");
  redirect("/admin/knowledge");
}

export async function restoreVersion(versionId: string) {
  await requireAdmin();
  const version = await db.knowledgeVersion.findUniqueOrThrow({ where: { id: versionId } });
  const { doc } = await saveDoc({ id: version.docId, title: version.title, content: version.content });
  await indexDoc(doc.id);
  await syncProjectsFromDocs();
  revalidatePath("/projects");
  revalidatePath(`/admin/knowledge/${doc.id}`);
}

export async function importFolder() {
  await requireAdmin();
  const result = await importKnowledgeFolder();
  await syncTimelineDoc();
  await syncProjectsFromDocs();
  revalidatePath("/projects");
  revalidatePath("/admin/knowledge");
  revalidatePath("/admin/timeline");
  revalidatePath("/");
  return result;
}

export async function saveTimeline(input: unknown) {
  await requireAdmin();
  const parsed = profileDataSchema.safeParse(input);
  if (!parsed.success) return { error: "Some fields are invalid. Every step needs a title." };
  await saveProfileData(parsed.data);
  await syncTimelineDoc(parsed.data);
  revalidatePath("/");
  revalidatePath("/admin/timeline");
  return { ok: true };
}

export async function saveLimitsAction(formData: FormData) {
  await requireAdmin();
  const parsed = limitsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/settings?error=1");
  await saveLimits(parsed.data);
  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=1");
}

export type SandboxResult = {
  error?: string;
  refused?: boolean;
  answer?: string;
  chunks?: { docTitle: string; content: string; score: number }[];
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
};

export async function testDonna(question: string): Promise<SandboxResult> {
  await requireAdmin();
  const trimmed = question.trim();
  if (!trimmed) return { error: "Type a question." };
  try {
    const prepared = await prepare(trimmed, [], { source: "sandbox" });
    if (prepared.kind === "refused") {
      return {
        refused: true,
        answer: prepared.text,
        chunks: [],
        inputTokens: prepared.usage.inputTokens,
        outputTokens: prepared.usage.outputTokens,
        costUsd: costUsd(prepared.usage),
      };
    }
    const limits = await getLimits();
    const final = await answerStream(trimmed, [], prepared.chunks, limits.maxTokensPerAnswer, prepared.owner).finalMessage();
    const answerUsage = { inputTokens: final.usage.input_tokens, outputTokens: final.usage.output_tokens };
    await recordAnswerUsage(answerUsage, { source: "sandbox" });
    const usage = addUsage(prepared.usage, answerUsage);
    const answer = final.content.map((block) => (block.type === "text" ? block.text : "")).join("");
    return {
      refused: false,
      answer,
      chunks: prepared.chunks.map(({ docTitle, content, score }) => ({ docTitle, content, score })),
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      costUsd: costUsd(usage),
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Request failed." };
  }
}

export async function savePrivacyAction(input: unknown): Promise<{ error?: string }> {
  await requireAdmin();
  const parsed = privacySchema.safeParse(input);
  if (!parsed.success) return { error: "Both languages need some text (max 20,000 characters each)." };
  await savePrivacy(parsed.data);
  revalidatePath("/privacy");
  return {};
}

export async function resetPrivacyAction(): Promise<PrivacyContent> {
  await requireAdmin();
  const content = defaultPrivacy(await getOwner());
  await savePrivacy(content);
  revalidatePath("/privacy");
  return content;
}

export async function createProjectDoc() {
  await requireAdmin();
  const { doc } = await saveDoc({ title: "Project: Name of the project", content: PROJECT_TEMPLATE });
  redirect(`/admin/knowledge/${doc.id}`);
}

export async function rebuildProjects(): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    await syncProjectsFromDocs(true);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Rebuild failed." };
  }
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/admin/projects");
  return {};
}

export async function askGaps(history: unknown): Promise<{ error?: string; answer?: string }> {
  await requireAdmin();
  const turns = sanitizeHistory(history);
  if (turns.length === 0 || turns[turns.length - 1].role !== "user") return { error: "Type a question." };
  try {
    const [docs, projects, steps, messages] = await Promise.all([
      db.knowledgeDoc.findMany({ select: { title: true, source: true, content: true }, orderBy: { title: "asc" } }),
      db.project.findMany({ select: { name: true, kind: true, role: true, start: true, end: true, summary: true, stack: true } }),
      getTimelineSteps(),
      db.chatMessage.findMany({ orderBy: { createdAt: "desc" }, take: 80, select: { question: true, answer: true, refused: true } }),
    ]);
    const inventory = {
      documents: docs.map((doc) => ({
        title: doc.title,
        source: doc.source,
        sections: [...doc.content.matchAll(/^##\s+(.+)$/gm)].map((match) => match[1].trim()),
        characters: doc.content.length,
      })),
      projects: projects.map((project) => ({
        name: project.name,
        kind: project.kind,
        role: project.role,
        period: [project.start, project.end].filter(Boolean).join(" – "),
        has_summary: Boolean(project.summary),
        stack: project.stack,
      })),
      timeline: steps.map((step) => ({ title: step.title, period: [step.start, step.end].filter(Boolean).join(" – ") })),
    };
    const unlinked = steps.filter((step) => !step.projectSlug).map((step) => step.title);
    const questions = messages.reverse().map((message) => ({
      question: message.question,
      answer: message.answer.slice(0, 280),
      no_information: /don't have that information|not listed in|δεν έχω αυτή την πληροφορία|δεν αναφέρεται/i.test(message.answer),
      refused: message.refused,
    }));
    const material = JSON.stringify({ inventory, unlinked_timeline_steps: unlinked, visitor_questions: questions }, null, 1);
    const { text } = await analyzeGaps(material, turns);
    return { answer: text };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Request failed." };
  }
}
