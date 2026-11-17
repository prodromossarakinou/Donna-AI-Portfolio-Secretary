import { createHash } from "crypto";
import { db } from "./db";
import { extractAbout, extractEducation, extractProjectCard, type AboutData, type EducationItem } from "./donna";
import { indexDoc } from "./knowledge";
import { getOwner, ownerFrom } from "./owner";
import { getProfileData, type ProfileData, type TimelineStep } from "./settings";

function period(start: string, end: string): string {
  return [start, end].filter(Boolean).join(" – ");
}

async function upsertGeneratedDoc(slug: string, title: string, content: string, source: string) {
  const existing = await db.knowledgeDoc.findUnique({ where: { slug } });
  if (!content.trim()) {
    if (existing) await db.knowledgeDoc.delete({ where: { id: existing.id } });
    return;
  }
  if (existing && existing.content === content && existing.title === title && existing.indexStatus === "READY") return;
  const doc = existing
    ? await db.knowledgeDoc.update({ where: { id: existing.id }, data: { title, content, source, indexStatus: "PENDING" } })
    : await db.knowledgeDoc.create({ data: { slug, title, content, source } });
  await indexDoc(doc.id);
}

export const PROJECT_TEMPLATE = `# Project: Name of the project

- Organization: 
- Period: 01/2024 – Present
- Role: 
- Stack: Next.js, Spring Boot
- Link: 
- Order: 1

## What it is

One or two sentences about what the project is and what it solves.

## What I did

- First thing
- Second thing
`;

const PROJECT_TITLE = /^(project|έργο|experience|εμπειρία)\s*:\s*(.+)$/i;

function parseProject(title: string, content: string) {
  const match = PROJECT_TITLE.exec(title.trim());
  const name = match?.[2]?.trim();
  if (!match || !name) return null;
  const kind = /^(project|έργο)$/i.test(match[1]) ? "project" : "experience";
  const meta = new Map<string, string>();
  const sections = new Map<string, string[]>();
  let current = "";
  for (const line of content.split("\n")) {
    const heading = /^##\s+(.*)$/.exec(line);
    if (heading) {
      current = heading[1].trim().toLowerCase();
      sections.set(current, []);
      continue;
    }
    if (/^#\s/.test(line)) continue;
    if (!current) {
      const field = /^[-*]\s*([A-Za-z ]+?)\s*:\s*(.*)$/.exec(line);
      if (field) meta.set(field[1].trim().toLowerCase(), field[2].trim());
      continue;
    }
    sections.get(current)?.push(line);
  }
  const section = (...keys: string[]) => {
    for (const [heading, lines] of sections) {
      if (keys.some((key) => heading.includes(key))) return lines;
    }
    return [];
  };
  const [start = "", end = ""] = (meta.get("period") ?? "").split(/\s+[–—-]\s+|\s*[–—]\s*/).map((part) => part.trim());
  const order = Number(meta.get("order"));
  return {
    name,
    kind,
    organization: meta.get("organization") ?? "",
    start,
    end,
    role: meta.get("role") ?? "",
    summary: section("what it is", "summary", "about").join("\n").trim().replace(/\s*\n\s*/g, " "),
    contributions: section("did", "contribution")
      .map((line) => line.replace(/^\s*[-*]\s*/, "").trim())
      .filter(Boolean),
    stack: (meta.get("stack") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    url: meta.get("link") ?? "",
    sortOrder: Number.isFinite(order) ? Math.trunc(order) : 0,
  };
}

function hashOf(title: string, content: string): string {
  return createHash("sha1").update(`${title}\n${content}`).digest("hex");
}

function clean(list: string[], max: number): string[] {
  return list.map((item) => item.trim().replace(/\.$/, "")).filter(Boolean).slice(0, max);
}

function stripVersion(name: string): string {
  return name.replace(/\s+v?\d+(?:\.\d+)*(?:\.x|\+)?$/i, "").trim();
}

export async function syncProjectsFromDocs(force = false) {
  const docs = await db.knowledgeDoc.findMany({ where: { source: "manual" } });
  const keep: string[] = [];
  for (const doc of docs) {
    const parsed = parseProject(doc.title, doc.content);
    if (!parsed) continue;
    keep.push(doc.slug);
    const sourceHash = hashOf(doc.title, doc.content);
    const existing = await db.project.findUnique({ where: { slug: doc.slug } });
    if (existing && existing.sourceHash === sourceHash && !force) continue;
    let data = parsed;
    let hash = sourceHash;
    try {
      const card = await extractProjectCard(doc.content);
      if (card) {
        data = {
          name: parsed.name,
          kind: parsed.kind,
          organization: card.organization.trim(),
          start: card.start.trim(),
          end: card.end.trim(),
          role: card.role.trim(),
          summary: card.summary.trim(),
          contributions: clean(card.contributions, 3),
          stack: [...new Set(clean(card.stack, 8).map(stripVersion))].filter(Boolean),
          url: card.url.trim() || parsed.url,
          sortOrder: parsed.sortOrder,
        };
      }
    } catch (error) {
      console.error("project card extraction failed", error);
      hash = "";
    }
    const values = { ...data, sourceHash: hash };
    await db.project.upsert({ where: { slug: doc.slug }, create: { slug: doc.slug, ...values }, update: values });
  }
  await db.project.deleteMany({ where: { slug: { notIn: keep } } });
  await db.knowledgeDoc.deleteMany({ where: { source: "project" } });
  await syncStackDoc();
  await syncEducationFromDocs(force);
  await syncAboutFromDocs(force);
  await syncTimelineDoc();
}

const EMPTY_ABOUT: AboutData = { phrases: [], summary: "", facts: [] };

export async function getAbout(): Promise<AboutData> {
  const row = await db.setting.findUnique({ where: { key: "about" } });
  const value = row?.value as (AboutData & { hash?: string }) | undefined;
  if (!value || !Array.isArray(value.phrases) || !Array.isArray(value.facts)) return EMPTY_ABOUT;
  return { phrases: value.phrases, summary: value.summary ?? "", facts: value.facts };
}

export async function syncAboutFromDocs(force = false) {
  const docs = await db.knowledgeDoc.findMany({ where: { source: "manual" }, orderBy: { createdAt: "asc" } });
  const doc = docs.find((item) => /^(about|σχετικά)/i.test(item.title.trim()));
  const row = await db.setting.findUnique({ where: { key: "about" } });
  if (!doc) {
    if (row) await db.setting.update({ where: { key: "about" }, data: { value: { ...EMPTY_ABOUT, hash: "" } } });
    return;
  }
  const hash = hashOf(doc.title, doc.content);
  if (!force && (row?.value as { hash?: string } | undefined)?.hash === hash) return;
  let about: AboutData | null = null;
  try {
    about = await extractAbout(doc.content);
  } catch (error) {
    console.error("about extraction failed", error);
  }
  if (!about) return;
  const value = {
    hash,
    phrases: clean(about.phrases, 6),
    summary: about.summary.trim(),
    facts: about.facts
      .map((fact) => ({ label: fact.label.trim(), value: fact.value.trim() }))
      .filter((fact) => fact.label && fact.value)
      .slice(0, 8),
  };
  await db.setting.upsert({ where: { key: "about" }, create: { key: "about", value }, update: { value } });
}

export type EducationData = { hash: string; items: EducationItem[] };

export async function getEducation(): Promise<EducationItem[]> {
  const row = await db.setting.findUnique({ where: { key: "education" } });
  const value = row?.value as EducationData | undefined;
  return Array.isArray(value?.items) ? value.items : [];
}

export async function syncEducationFromDocs(force = false) {
  const docs = await db.knowledgeDoc.findMany({ where: { source: "manual" }, orderBy: { createdAt: "asc" } });
  const doc = docs.find((item) => /^(education|εκπαίδευση|σπουδές)/i.test(item.title.trim()));
  const row = await db.setting.findUnique({ where: { key: "education" } });
  if (!doc) {
    if (row) await db.setting.update({ where: { key: "education" }, data: { value: { hash: "", items: [] } } });
    return;
  }
  const hash = hashOf(doc.title, doc.content);
  if (!force && (row?.value as EducationData | undefined)?.hash === hash) return;
  let items: EducationItem[] | null = null;
  try {
    items = await extractEducation(doc.content);
  } catch (error) {
    console.error("education extraction failed", error);
  }
  if (!items) return;
  const value = { hash, items: items.filter((item) => item.title.trim()).slice(0, 30) };
  await db.setting.upsert({ where: { key: "education" }, create: { key: "education", value }, update: { value } });
}

export async function syncStackDoc() {
  const projects = await db.project.findMany({
    where: { kind: "project", NOT: { summary: "" } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  const { first } = await getOwner();
  const byTech = new Map<string, string[]>();
  for (const project of projects) {
    for (const tech of project.stack) byTech.set(tech, [...(byTech.get(tech) ?? []), project.name]);
  }
  const lines = [...byTech.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .map(([tech, names]) => `## ${tech}\n\n${first} used ${tech} on: ${names.join(", ")}.`);
  const overview = projects.length
    ? `## All projects\n\nProjects in his portfolio: ${projects.map((project) => project.name).join(", ")}.`
    : "";
  await upsertGeneratedDoc("generated-stack", "Technologies by project", [overview, ...lines].filter(Boolean).join("\n\n"), "stack");
}

export type TimelineView = TimelineStep & { projectSlug?: string };

export async function getTimelineSteps(): Promise<TimelineView[]> {
  const [profile, projects] = await Promise.all([
    getProfileData(),
    db.project.findMany({ where: { kind: "project", NOT: { summary: "" } }, select: { slug: true, name: true } }),
  ]);
  return profile.timeline.map((step) => {
    const title = step.title.toLowerCase();
    const match = projects.find((project) => title.includes(project.name.toLowerCase()));
    return { ...step, projectSlug: match?.slug };
  });
}

export async function syncTimelineDoc(data?: ProfileData) {
  const profile = data ?? (await getProfileData());
  const { status } = profile;
  const statusLines = [
    status.role && `Current role: ${status.role}.`,
    status.project && `Current project: ${status.project}.`,
    status.focus && `Current focus: ${status.focus}.`,
    status.availability.length && `Working modes: ${status.availability.join(", ")}.`,
  ].filter(Boolean);
  const career = profile.timeline
    .map((step) => `- ${[period(step.start, step.end), step.title, step.organization].filter(Boolean).join(" — ")}`)
    .join("\n");
  const steps = profile.timeline.map((step) => {
    const facts = [
      step.organization && `Organization: ${step.organization}.`,
      period(step.start, step.end) && `Period: ${period(step.start, step.end)}.`,
      step.description,
      step.stack.length && `Stack: ${step.stack.join(", ")}.`,
    ].filter(Boolean);
    return `## ${step.title}\n\n${facts.join(" ")}`;
  });
  const ongoing = profile.timeline.filter((step) => /present|σήμερα|now/i.test(step.end));
  const current = ongoing
    .map((step) => `- ${[step.title, step.organization, step.start && `since ${step.start}`].filter(Boolean).join(" — ")}`)
    .join("\n");
  const content = [
    current
      ? `## Current roles (he holds all of these at the same time)\n\n${ownerFrom(profile.profile.name).first} currently works in ${ongoing.length} ongoing role${ongoing.length === 1 ? "" : "s"} in parallel:\n\n${current}`
      : "",
    statusLines.length ? `## Current professional status\n\n${statusLines.join(" ")}` : "",
    career ? `## Career timeline, most recent first\n\n${career}` : "",
    ...steps,
  ]
    .filter(Boolean)
    .join("\n\n");
  await upsertGeneratedDoc("generated-timeline", "Career timeline", content, "timeline");
}
