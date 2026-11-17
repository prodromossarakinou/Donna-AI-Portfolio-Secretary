import { db } from "./db";

export type UsageSource = "chat" | "sandbox" | "indexing" | "admin";

export type UsageContext = { source: UsageSource; linkId?: string };

export async function recordUsage(entry: {
  provider: "anthropic" | "openai";
  kind: "guard" | "answer" | "embedding" | "extract";
  model: string;
  inputTokens: number;
  outputTokens?: number;
  costUsd: number;
  context: UsageContext;
}) {
  try {
    await db.apiUsage.create({
      data: {
        provider: entry.provider,
        kind: entry.kind,
        source: entry.context.source,
        model: entry.model,
        inputTokens: entry.inputTokens,
        outputTokens: entry.outputTokens ?? 0,
        costUsd: entry.costUsd,
        linkId: entry.context.linkId ?? null,
      },
    });
  } catch (error) {
    console.error("usage log failed", error);
  }
}

export async function monthCostUsd(): Promise<number> {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const total = await db.apiUsage.aggregate({ _sum: { costUsd: true }, where: { createdAt: { gte: monthStart } } });
  return total._sum.costUsd ?? 0;
}
