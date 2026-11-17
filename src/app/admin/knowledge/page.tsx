import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { createDoc } from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ImportFolderButton } from "@/components/admin/knowledge-forms";

export default async function KnowledgePage() {
  await requireAdmin();
  const docs = await db.knowledgeDoc.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { chunks: true, versions: true } } },
  });
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Knowledge</h1>
          <p className="text-sm text-muted-foreground">
            Donna answers only from these documents. Professional facts only.
          </p>
        </div>
        <div className="flex gap-2">
          <ImportFolderButton />
          <form action={createDoc}>
            <Button type="submit">New document</Button>
          </form>
        </div>
      </header>
      <div className="rounded-xl border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Index</TableHead>
              <TableHead className="text-right">Chunks</TableHead>
              <TableHead className="text-right">Versions</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {docs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No documents yet. Create one, or import the /knowledge folder.
                </TableCell>
              </TableRow>
            )}
            {docs.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>
                  <Link href={`/admin/knowledge/${doc.id}`} className="font-medium underline-offset-4 hover:underline">
                    {doc.title}
                  </Link>
                  <p className="font-mono text-xs text-muted-foreground">
                    {doc.slug}
                    {doc.source !== "manual" && ` · auto from ${doc.source}`}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge variant={doc.indexStatus === "READY" ? "default" : doc.indexStatus === "ERROR" ? "destructive" : "secondary"}>
                    {doc.indexStatus.toLowerCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{doc._count.chunks}</TableCell>
                <TableCell className="text-right tabular-nums">{doc._count.versions}</TableCell>
                <TableCell className="text-xs">{formatDate(doc.updatedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
