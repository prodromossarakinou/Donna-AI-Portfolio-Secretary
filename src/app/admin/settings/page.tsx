import { requireAdmin } from "@/lib/admin";
import { getLimits } from "@/lib/settings";
import { saveLimitsAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireAdmin();
  const [limits, query] = await Promise.all([getLimits(), searchParams]);
  const fields = [
    { name: "maxMessagesPerDay", label: "Max messages per day, per link", value: limits.maxMessagesPerDay, step: 1 },
    { name: "maxTokensPerAnswer", label: "Max tokens per answer", value: limits.maxTokensPerAnswer, step: 1 },
    { name: "monthlyCostCapUsd", label: "Monthly cost cap (USD, 0 = no cap)", value: limits.monthlyCostCapUsd, step: 0.01 },
    { name: "ratePerMinute", label: "Messages per minute, per IP", value: limits.ratePerMinute, step: 1 },
  ];
  return (
    <div className="space-y-8 max-w-xl">
      <header>
        <h1 className="text-2xl font-semibold">Limits</h1>
        <p className="text-sm text-muted-foreground">
          When the monthly cap is reached Donna stops answering until the next month.
        </p>
      </header>
      <form action={saveLimitsAction} className="rounded-xl border bg-card p-5 space-y-4">
        {fields.map((field) => (
          <div key={field.name} className="space-y-1.5">
            <Label htmlFor={field.name}>{field.label}</Label>
            <Input id={field.name} name={field.name} type="number" min={0} step={field.step} defaultValue={field.value} required />
          </div>
        ))}
        <Button type="submit">Save limits</Button>
        {query.saved && <p className="text-sm text-muted-foreground">Saved.</p>}
        {query.error && <p className="text-sm text-destructive">Invalid values — nothing was saved.</p>}
      </form>
    </div>
  );
}
