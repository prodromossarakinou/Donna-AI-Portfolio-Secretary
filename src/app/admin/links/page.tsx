import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { linkStatus, shareUrl } from "@/lib/codes";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CopyButton } from "@/components/admin/copy-button";
import { CreateLinkForm, LinkActions } from "@/components/admin/link-forms";

export default async function LinksPage() {
  await requireAdmin();
  const links = await db.accessLink.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { sessions: true, messages: true } } },
  });
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Access links</h1>
        <p className="text-sm text-muted-foreground">One code per company. Share the URL or the plain code.</p>
      </header>
      <CreateLinkForm />
      <div className="rounded-xl border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Last access</TableHead>
              <TableHead className="text-right">Sessions</TableHead>
              <TableHead className="text-right">Messages</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {links.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No links yet.
                </TableCell>
              </TableRow>
            )}
            {links.map((link) => {
              const status = linkStatus(link);
              return (
                <TableRow key={link.id}>
                  <TableCell>
                    <Link href={`/admin/links/${link.id}`} className="font-medium underline-offset-4 hover:underline">
                      {link.label}
                    </Link>
                    {link.note && <p className="text-xs text-muted-foreground max-w-56 truncate">{link.note}</p>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-xs">{link.code}</code>
                      <CopyButton value={shareUrl(link.code)} label="URL" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={status === "active" ? "default" : status === "revoked" ? "destructive" : "secondary"}>
                      {status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{formatDate(link.createdAt)}</TableCell>
                  <TableCell className="text-xs">{formatDate(link.expiresAt)}</TableCell>
                  <TableCell className="text-xs">{formatDate(link.lastAccessAt)}</TableCell>
                  <TableCell className="text-right tabular-nums">{link._count.sessions}</TableCell>
                  <TableCell className="text-right tabular-nums">{link._count.messages}</TableCell>
                  <TableCell>
                    <LinkActions id={link.id} label={link.label} revoked={Boolean(link.revokedAt)} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
