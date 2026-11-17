import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { DocEditor } from "@/components/admin/knowledge-forms";

export default async function DocPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const doc = await db.knowledgeDoc.findUnique({
    where: { id },
    include: { versions: { orderBy: { createdAt: "desc" }, take: 30 } },
  });
  if (!doc) notFound();
  return (
    <div className="space-y-6">
      <Link href="/admin/knowledge" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
        ← Knowledge
      </Link>
      <DocEditor
        key={doc.updatedAt.toISOString()}
        id={doc.id}
        title={doc.title}
        content={doc.content}
        status={doc.indexStatus}
        indexError={doc.indexError}
        generatedFrom={doc.source === "manual" ? null : doc.source}
        versions={doc.versions.map((version) => ({
          id: version.id,
          title: version.title,
          createdAt: formatDate(version.createdAt),
          length: version.content.length,
        }))}
      />
    </div>
  );
}
