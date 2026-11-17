import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { formatDate, formatNumber, formatUsd } from "@/lib/format";
import { getLimits } from "@/lib/settings";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const DAYS = 30;

export default async function UsagePage() {
  await requireAdmin();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const rangeStart = new Date(dayStart.getTime() - (DAYS - 1) * 86_400_000);

  const [month, refusedMonth, today, perDay, perLink, links, limits, apiRows] = await Promise.all([
    db.chatMessage.aggregate({
      where: { createdAt: { gte: monthStart } },
      _sum: { inputTokens: true, outputTokens: true, costUsd: true },
      _count: true,
    }),
    db.chatMessage.count({ where: { createdAt: { gte: monthStart }, refused: true } }),
    db.chatMessage.count({ where: { createdAt: { gte: dayStart } } }),
    db.$queryRaw<{ day: Date; count: number }[]>`
      SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::int AS count
      FROM "ChatMessage" WHERE "createdAt" >= ${rangeStart}
      GROUP BY 1 ORDER BY 1`,
    db.chatMessage.groupBy({
      by: ["linkId"],
      _sum: { inputTokens: true, outputTokens: true, costUsd: true },
      _count: true,
    }),
    db.accessLink.findMany({
      orderBy: { lastAccessAt: { sort: "desc", nulls: "last" } },
      include: { _count: { select: { sessions: true } } },
    }),
    getLimits(),
    db.apiUsage.groupBy({
      by: ["provider", "kind", "source", "model"],
      where: { createdAt: { gte: monthStart } },
      _sum: { inputTokens: true, outputTokens: true, costUsd: true },
      _count: true,
    }),
  ]);

  const counts = new Map(perDay.map((row) => [row.day.toISOString().slice(0, 10), row.count]));
  const series = Array.from({ length: DAYS }, (_, i) => {
    const day = new Date(rangeStart.getTime() + i * 86_400_000).toISOString().slice(0, 10);
    return { day, count: counts.get(day) ?? 0 };
  });
  const peak = Math.max(1, ...series.map((point) => point.count));
  const byLink = new Map(perLink.map((row) => [row.linkId, row]));
  const providers = [
    { id: "anthropic", name: "Claude API", key: "ANTHROPIC_API_KEY" },
    { id: "openai", name: "OpenAI API", key: "OPENAI_API_KEY" },
  ].map((provider) => {
    const rows = apiRows
      .filter((row) => row.provider === provider.id)
      .sort((a, b) => (b._sum.costUsd ?? 0) - (a._sum.costUsd ?? 0));
    return {
      ...provider,
      rows,
      calls: rows.reduce((sum, row) => sum + row._count, 0),
      input: rows.reduce((sum, row) => sum + (row._sum.inputTokens ?? 0), 0),
      output: rows.reduce((sum, row) => sum + (row._sum.outputTokens ?? 0), 0),
      cost: rows.reduce((sum, row) => sum + (row._sum.costUsd ?? 0), 0),
    };
  });
  const monthCost = providers.reduce((sum, provider) => sum + provider.cost, 0);

  const cards = [
    { label: "Messages today", value: formatNumber(today) },
    { label: "Messages this month", value: formatNumber(month._count) },
    { label: "Est. cost this month (both APIs)", value: `${formatUsd(monthCost)} / ${formatUsd(limits.monthlyCostCapUsd)}` },
    { label: "Refused this month", value: formatNumber(refusedMonth) },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Usage</h1>
        <p className="text-sm text-muted-foreground">Costs are estimates from token counts and the configured prices.</p>
      </header>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border bg-card p-4">
            <dt className="text-xs text-muted-foreground">{card.label}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{card.value}</dd>
          </div>
        ))}
      </dl>
      <section className="grid gap-4 lg:grid-cols-2">
        {providers.map((provider) => (
          <div key={provider.id} className="rounded-xl border bg-card p-5 space-y-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-medium">{provider.name}</h2>
              <span className="font-mono text-[10px] text-muted-foreground">{provider.key} · this month</span>
            </div>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Calls", value: formatNumber(provider.calls) },
                { label: "Input tokens", value: formatNumber(provider.input) },
                { label: "Output tokens", value: formatNumber(provider.output) },
                { label: "Est. cost", value: formatUsd(provider.cost) },
              ].map((item) => (
                <div key={item.label}>
                  <dt className="text-xs text-muted-foreground">{item.label}</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums">{item.value}</dd>
                </div>
              ))}
            </dl>
            {provider.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No calls this month.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Used for</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Calls</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Est. cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {provider.rows.map((row) => (
                    <TableRow key={`${row.kind}-${row.source}-${row.model}`}>
                      <TableCell>
                        {row.kind} · {row.source}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{row.model}</TableCell>
                      <TableCell className="text-right tabular-nums">{row._count}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber((row._sum.inputTokens ?? 0) + (row._sum.outputTokens ?? 0))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatUsd(row._sum.costUsd ?? 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        ))}
      </section>
      <section className="rounded-xl border bg-card p-5">
        <h2 className="text-sm font-medium">Messages per day · last {DAYS} days</h2>
        <div className="mt-4 flex h-36 items-end gap-1">
          {series.map((point) => (
            <div
              key={point.day}
              title={`${point.day}: ${point.count}`}
              className="flex-1 rounded-t bg-primary/80 min-h-px"
              style={{ height: `${(point.count / peak) * 100}%` }}
            />
          ))}
        </div>
        <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
          <span>{series[0].day}</span>
          <span>peak {Math.max(0, ...series.map((point) => point.count))}/day</span>
          <span>{series[series.length - 1].day}</span>
        </div>
      </section>
      <section className="rounded-xl border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Link</TableHead>
              <TableHead className="text-right">Sessions</TableHead>
              <TableHead className="text-right">Messages</TableHead>
              <TableHead className="text-right">Tokens</TableHead>
              <TableHead className="text-right">Est. cost</TableHead>
              <TableHead>Last access</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {links.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No links yet.
                </TableCell>
              </TableRow>
            )}
            {links.map((link) => {
              const row = byLink.get(link.id);
              return (
                <TableRow key={link.id}>
                  <TableCell>
                    <Link href={`/admin/links/${link.id}`} className="font-medium underline-offset-4 hover:underline">
                      {link.label}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{link._count.sessions}</TableCell>
                  <TableCell className="text-right tabular-nums">{row?._count ?? 0}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber((row?._sum.inputTokens ?? 0) + (row?._sum.outputTokens ?? 0))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatUsd(row?._sum.costUsd ?? 0)}</TableCell>
                  <TableCell className="text-xs">{formatDate(link.lastAccessAt)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
