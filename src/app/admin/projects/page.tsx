import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { createProjectDoc } from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RebuildButton } from "@/components/admin/rebuild-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function AdminProjectsPage() {
  await requireAdmin();
  const projects = await db.project.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
  const docs = await db.knowledgeDoc.findMany({ where: { slug: { in: projects.map((project) => project.slug) } }, select: { id: true, slug: true } });
  const docId = new Map(docs.map((doc) => [doc.slug, doc.id]));
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground">
            One markdown document each, titled &quot;Project: Name&quot;. A timeline step whose title contains the project name links to its card. Saving it rebuilds its card in English, in any language you write it, and updates Donna&apos;s knowledge.
          </p>
        </div>
        <div className="flex gap-2">
          <RebuildButton />
          <form action={createProjectDoc}>
            <Button type="submit">New project (markdown)</Button>
          </form>
        </div>
      </header>
      <div className="rounded-xl border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Stack</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Order</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No projects yet.
                </TableCell>
              </TableRow>
            )}
            {projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell>
                  <Link href={`/admin/knowledge/${docId.get(project.slug) ?? ""}`} className="font-medium underline-offset-4 hover:underline">
                    {project.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{project.organization}</p>
                </TableCell>
                <TableCell className="text-sm">{project.role}</TableCell>
                <TableCell className="text-xs">{[project.start, project.end].filter(Boolean).join(" – ")}</TableCell>
                <TableCell className="max-w-64 truncate text-xs">{project.stack.join(", ")}</TableCell>
                <TableCell>
                  <Badge variant={project.kind === "project" ? "default" : "secondary"}>{project.kind}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{project.sortOrder}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
