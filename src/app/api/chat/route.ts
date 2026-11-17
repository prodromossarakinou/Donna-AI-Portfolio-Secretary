import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  addUsage,
  answerStream,
  costUsd,
  limitText,
  prepare,
  recordAnswerUsage,
  refusalText,
  sanitizeHistory,
  unavailableText,
  type Usage,
} from "@/lib/donna";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getLimits } from "@/lib/settings";
import { monthCostUsd } from "@/lib/usage";
import { getVisitor, type Visitor } from "@/lib/visitor";

export const maxDuration = 60;

function textResponse(text: string, status = 200) {
  return new Response(text, { status, headers: { "content-type": "text/plain; charset=utf-8" } });
}

async function log(visitor: Visitor, question: string, answer: string, refused: boolean, usage: Usage) {
  const now = new Date();
  await db.$transaction([
    db.chatMessage.create({
      data: {
        linkId: visitor.link.id,
        sessionId: visitor.session.id,
        question,
        answer,
        refused,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        costUsd: costUsd(usage),
      },
    }),
    db.visitorSession.update({ where: { id: visitor.session.id }, data: { lastSeenAt: now } }),
    db.accessLink.update({ where: { id: visitor.link.id }, data: { lastAccessAt: now } }),
  ]);
}

export async function POST(request: Request) {
  const visitor = await getVisitor();
  if (!visitor) return NextResponse.json({ error: "Your access has expired." }, { status: 401 });

  const limits = await getLimits();
  if (!rateLimit(`chat:${clientIp(request.headers)}`, limits.ratePerMinute)) {
    return NextResponse.json({ error: "Too many messages. Please wait a moment." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { message?: unknown; history?: unknown } | null;
  const question = typeof body?.message === "string" ? body.message.trim() : "";
  if (!question) return NextResponse.json({ error: "Empty message." }, { status: 400 });
  if (question.length > 1000) {
    return NextResponse.json({ error: "Please keep the question under 1000 characters." }, { status: 400 });
  }
  const history = sanitizeHistory(body?.history);

  const now = new Date();
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const [todayCount, monthCost] = await Promise.all([
    db.chatMessage.count({ where: { linkId: visitor.link.id, createdAt: { gte: dayStart } } }),
    monthCostUsd(),
  ]);
  if (todayCount >= limits.maxMessagesPerDay) return textResponse(limitText(question));
  if (limits.monthlyCostCapUsd > 0 && monthCost >= limits.monthlyCostCapUsd) {
    return textResponse(unavailableText(question));
  }

  const usageContext = { source: "chat" as const, linkId: visitor.link.id };
  let prepared;
  try {
    prepared = await prepare(question, history, usageContext);
  } catch (error) {
    console.error("donna prepare failed", error);
    return textResponse(unavailableText(question), 502);
  }

  if (prepared.kind === "refused") {
    await log(visitor, question, prepared.text, true, prepared.usage);
    return textResponse(prepared.text);
  }

  const { chunks, meaning, owner, usage: guardUsage } = prepared;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let answer = "";
      let usage = guardUsage;
      let refused = false;
      try {
        const modelStream = answerStream(question, history, chunks, limits.maxTokensPerAnswer, owner, meaning);
        modelStream.on("text", (delta) => {
          answer += delta;
          controller.enqueue(encoder.encode(delta));
        });
        const final = await modelStream.finalMessage();
        const answerUsage = { inputTokens: final.usage.input_tokens, outputTokens: final.usage.output_tokens };
        await recordAnswerUsage(answerUsage, usageContext);
        usage = addUsage(usage, answerUsage);
        if (final.stop_reason === "refusal" || !answer.trim()) {
          refused = true;
          const fallback = refusalText(question);
          controller.enqueue(encoder.encode(answer ? `\n\n${fallback}` : fallback));
          answer = answer ? `${answer}\n\n${fallback}` : fallback;
        }
      } catch (error) {
        console.error("donna answer failed", error);
        const fallback = unavailableText(question);
        controller.enqueue(encoder.encode(answer ? `\n\n${fallback}` : fallback));
        answer = answer ? `${answer}\n\n${fallback}` : fallback;
      }
      try {
        await log(visitor, question, answer, refused, usage);
      } catch (error) {
        console.error("donna log failed", error);
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-accel-buffering": "no",
    },
  });
}
