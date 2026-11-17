import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { db } from "./db";
import { embed, toVectorLiteral } from "./embeddings";
import { knowledgeDir, readTimelineFile, saveProfileData } from "./settings";
import type { UsageContext } from "./usage";

const MAX_CHUNK_CHARS = 1400;

export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `doc-${randomUUID().slice(0, 8)}`;
}

function splitLong(text: string): string[] {
  if (text.length <= MAX_CHUNK_CHARS) return [text];
  const parts: string[] = [];
  let current = "";
  for (const paragraph of text.split(/\n{2,}/)) {
    if (current && current.length + paragraph.length + 2 > MAX_CHUNK_CHARS) {
      parts.push(current);
      current = "";
    }
    if (paragraph.length > MAX_CHUNK_CHARS) {
      for (let i = 0; i < paragraph.length; i += MAX_CHUNK_CHARS) {
        parts.push(paragraph.slice(i, i + MAX_CHUNK_CHARS));
      }
      continue;
    }
    current = current ? `${current}\n\n${paragraph}` : paragraph;
  }
  if (current) parts.push(current);
  return parts;
}

export function chunkMarkdown(title: string, content: string): string[] {
  const sections: { heading: string; body: string[] }[] = [{ heading: "", body: [] }];
  for (const line of content.split("\n")) {
    const match = /^(#{1,3})\s+(.*)$/.exec(line);
    if (match) sections.push({ heading: match[2].trim(), body: [] });
    else sections[sections.length - 1].body.push(line);
  }
  const chunks: string[] = [];
  for (const section of sections) {
    const body = section.body.join("\n").trim();
    if (!body) continue;
    const prefix = section.heading ? `${title} — ${section.heading}` : title;
    for (const part of splitLong(body)) chunks.push(`${prefix}\n\n${part}`);
  }
  return chunks;
}

export async function indexDoc(docId: string): Promise<void> {
  const doc = await db.knowledgeDoc.findUnique({ where: { id: docId } });
  if (!doc) return;
  await db.knowledgeDoc.update({ where: { id: docId }, data: { indexStatus: "INDEXING", indexError: null } });
  try {
    const chunks = chunkMarkdown(doc.title, doc.content);
    const vectors = await embed(chunks, { source: "indexing" });
    await db.$transaction(async (tx) => {
      await tx.knowledgeChunk.deleteMany({ where: { docId } });
      for (let i = 0; i < chunks.length; i++) {
        await tx.$executeRaw`
          INSERT INTO "KnowledgeChunk" ("id", "docId", "idx", "content", "embedding")
          VALUES (${randomUUID()}, ${docId}, ${i}, ${chunks[i]}, ${toVectorLiteral(vectors[i])}::vector)`;
      }
      await tx.knowledgeDoc.update({
        where: { id: docId },
        data: { indexStatus: "READY", indexedAt: new Date(), indexError: null },
      });
    });
  } catch (error) {
    await db.knowledgeDoc.update({
      where: { id: docId },
      data: { indexStatus: "ERROR", indexError: error instanceof Error ? error.message : String(error) },
    });
  }
}

export type RetrievedChunk = { id: string; docTitle: string; content: string; score: number };

async function nearest(vector: number[], limit: number): Promise<RetrievedChunk[]> {
  const literal = toVectorLiteral(vector);
  return db.$queryRaw<RetrievedChunk[]>`
    SELECT c."id", d."title" AS "docTitle", c."content",
           (1 - (c."embedding" <=> ${literal}::vector))::float AS "score"
    FROM "KnowledgeChunk" c
    JOIN "KnowledgeDoc" d ON d."id" = c."docId"
    WHERE c."embedding" IS NOT NULL
    ORDER BY c."embedding" <=> ${literal}::vector
    LIMIT ${limit}`;
}

export async function retrieve(question: string, context: UsageContext, conversation = ""): Promise<RetrievedChunk[]> {
  const k = Math.max(Number(process.env.RAG_TOP_K) || 0, 8);
  if (!conversation) {
    const [vector] = await embed([question], context);
    return nearest(vector, k);
  }
  const [inContext, standalone] = await embed([`${conversation}\n${question}`, question], context);
  const chunks = await nearest(inContext, k);
  const seen = new Set(chunks.map((chunk) => chunk.id));
  for (const chunk of await nearest(standalone, 4)) {
    if (!seen.has(chunk.id)) chunks.push(chunk);
  }
  return chunks;
}

export async function saveDoc(input: { id?: string; title: string; slug?: string; content: string }) {
  if (input.id) {
    const existing = await db.knowledgeDoc.findUniqueOrThrow({ where: { id: input.id } });
    const changed = existing.content !== input.content || existing.title !== input.title;
    if (!changed) return { doc: existing, changed: false };
    await db.knowledgeVersion.create({
      data: { docId: existing.id, title: existing.title, content: existing.content },
    });
    const doc = await db.knowledgeDoc.update({
      where: { id: existing.id },
      data: { title: input.title, content: input.content, indexStatus: "PENDING" },
    });
    return { doc, changed: true };
  }
  const base = input.slug ?? slugify(input.title);
  let slug = base;
  for (let n = 2; await db.knowledgeDoc.findUnique({ where: { slug } }); n++) slug = `${base}-${n}`;
  const doc = await db.knowledgeDoc.create({ data: { title: input.title, slug, content: input.content } });
  return { doc, changed: true };
}

export function titleFromMarkdown(content: string, fallback: string): string {
  const match = /^#\s+(.+)$/m.exec(content);
  return match ? match[1].trim() : fallback;
}

export async function importKnowledgeFolder() {
  const dir = knowledgeDir();
  let files: string[] = [];
  try {
    files = (await fs.readdir(dir)).filter((name) => name.endsWith(".md")).sort();
  } catch {
    files = [];
  }
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  for (const file of files) {
    const content = await fs.readFile(path.join(dir, file), "utf8");
    const base = file.replace(/\.md$/, "");
    const slug = slugify(base);
    const title = titleFromMarkdown(content, base);
    const existing = await db.knowledgeDoc.findUnique({ where: { slug } });
    const result = await saveDoc({ id: existing?.id, slug, title, content });
    if (!existing) created++;
    else if (result.changed) updated++;
    else unchanged++;
    if (result.changed || result.doc.indexStatus !== "READY") await indexDoc(result.doc.id);
  }
  const timeline = await readTimelineFile();
  if (timeline) await saveProfileData(timeline);
  return { created, updated, unchanged, timelineImported: Boolean(timeline) };
}
