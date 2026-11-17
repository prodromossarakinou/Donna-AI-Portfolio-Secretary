import { syncProjectsFromDocs, syncTimelineDoc } from "../src/lib/generated";
import { importKnowledgeFolder } from "../src/lib/knowledge";
import { db } from "../src/lib/db";

async function main() {
  const result = await importKnowledgeFolder();
  await syncTimelineDoc();
  await syncProjectsFromDocs();
  const docs = await db.knowledgeDoc.findMany({ select: { slug: true, indexStatus: true, indexError: true } });
  console.log(result, docs);
  await db.$disconnect();
}

main();
