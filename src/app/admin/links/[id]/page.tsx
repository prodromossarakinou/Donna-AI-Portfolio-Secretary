import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { linkStatus } from "@/lib/codes";
import { db } from "@/lib/db";
import { formatDate, formatNumber, formatUsd } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export default async function LinkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const link = await db.accessLink.findUnique({
    where: { id },
    include: { _count: { select: { sessions: true } }, messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!link) notFound();
  const tokens = link.messages.reduce((sum, m) => sum + m.inputTokens + m.outputTokens, 0);
  const cost = link.messages.reduce((sum, m) => sum + m.costUsd, 0);
  const stats = [
    { label: "Sessions", value: formatNumber(link._count.sessions) },
    { label: "Messages", value: formatNumber(link.messages.length) },
    { label: "Tokens", value: formatNumber(tokens) },
    { label: "Est. cost", value: formatUsd(cost) },
    { label: "Last access", value: formatDate(link.lastAccessAt) },
  ];
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <Link href="/admin/links" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
          ← Access links
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{link.label}</h1>
          <Badge variant="secondary">{linkStatus(link)}</Badge>
          <code className="font-mono text-sm">{link.code}</code>
        </div>
        {link.note && <p className="text-sm text-muted-foreground">{link.note}</p>}
      </header>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border bg-card p-4">
            <dt className="text-xs text-muted-foreground">{stat.label}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Conversation</h2>
        {link.messages.length === 0 && <p className="text-sm text-muted-foreground">No questions asked yet.</p>}
        <ol className="space-y-3">
          {link.messages.map((message) => (
            <li key={message.id} className="rounded-xl border p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{formatDate(message.createdAt)}</span>
                {message.refused && <Badge variant="destructive">refused</Badge>}
              </div>
              <p className="font-medium">{message.question}</p>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{message.answer}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
