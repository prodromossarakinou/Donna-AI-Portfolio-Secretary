import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

const HELPFUL: Record<string, string> = { yes: "Donna answered", partly: "Donna partly answered", no: "Donna did not answer" };
const CONTACT: Record<string, string> = { yes: "Would contact", maybe: "Not sure", no: "Would not contact" };

function average(values: number[]): string {
  return values.length ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1) : "—";
}

function share(items: { value: string }[], value: string): string {
  return items.length ? `${Math.round((items.filter((item) => item.value === value).length / items.length) * 100)}%` : "—";
}

export default async function AdminFeedbackPage() {
  await requireAdmin();
  const entries = await db.feedback.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  const cards = [
    { label: "Responses", value: String(entries.length) },
    { label: "Usefulness (1–5)", value: average(entries.map((entry) => entry.rating)) },
    { label: "Ease of use (1–5)", value: average(entries.map((entry) => entry.ease)) },
    { label: "Donna answered", value: share(entries.map((entry) => ({ value: entry.donnaHelpful })), "yes") },
    { label: "Would contact", value: share(entries.map((entry) => ({ value: entry.wouldContact })), "yes") },
  ];
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Feedback</h1>
        <p className="text-sm text-muted-foreground">
          Each access link has a feedback link that never expires. Copy it from Access links.
        </p>
      </header>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border bg-card p-4">
            <dt className="text-xs text-muted-foreground">{card.label}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{card.value}</dd>
          </div>
        ))}
      </dl>
      {entries.length === 0 && <p className="text-sm text-muted-foreground">No feedback yet.</p>}
      <ol className="space-y-3">
        {entries.map((entry) => (
          <li key={entry.id} className="rounded-xl border p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{entry.linkLabel || "Deleted link"}</span>
              <span>{formatDate(entry.createdAt)}</span>
              {(entry.name || entry.email) && <span>· {[entry.name, entry.email].filter(Boolean).join(" · ")}</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>Useful {entry.rating}/5</Badge>
              <Badge variant="secondary">Ease {entry.ease}/5</Badge>
              <Badge variant={entry.donnaHelpful === "no" ? "destructive" : "secondary"}>{HELPFUL[entry.donnaHelpful] ?? entry.donnaHelpful}</Badge>
              <Badge variant={entry.wouldContact === "no" ? "destructive" : "secondary"}>{CONTACT[entry.wouldContact] ?? entry.wouldContact}</Badge>
            </div>
            {entry.missing && (
              <div>
                <p className="text-xs text-muted-foreground">Looked for and did not find</p>
                <p className="whitespace-pre-wrap text-sm">{entry.missing}</p>
              </div>
            )}
            {entry.improve && (
              <div>
                <p className="text-xs text-muted-foreground">Would change or add</p>
                <p className="whitespace-pre-wrap text-sm">{entry.improve}</p>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
