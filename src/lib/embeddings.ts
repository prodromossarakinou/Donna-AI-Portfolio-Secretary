import { recordUsage, type UsageContext } from "./usage";

export const EMBEDDING_DIMENSIONS = 1536;

export function embeddingModel(): string {
  return process.env.EMBEDDING_MODEL || "text-embedding-3-small";
}

export async function embed(texts: string[], context: UsageContext): Promise<number[][]> {
  if (texts.length === 0) return [];
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: embeddingModel(), input: texts, dimensions: EMBEDDING_DIMENSIONS }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Embeddings request failed (${response.status}): ${detail.slice(0, 300)}`);
  }
  const json = (await response.json()) as {
    data: { index: number; embedding: number[] }[];
    usage?: { total_tokens?: number };
  };
  const tokens = json.usage?.total_tokens ?? 0;
  const price = Number(process.env.EMBEDDING_PRICE_PER_MTOK) || 0.02;
  await recordUsage({
    provider: "openai",
    kind: "embedding",
    model: embeddingModel(),
    inputTokens: tokens,
    costUsd: (tokens * price) / 1_000_000,
    context,
  });
  return json.data.sort((a, b) => a.index - b.index).map((item) => item.embedding);
}

export function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}
