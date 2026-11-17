import { NextResponse } from "next/server";
import { normalizeCode } from "@/lib/codes";
import { db } from "@/lib/db";
import { feedbackSchema } from "@/lib/feedback";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!rateLimit(`feedback:${clientIp(request.headers)}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429 });
  }
  const parsed = feedbackSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please answer the required questions and check the email address." }, { status: 400 });
  }
  const { code, ...answers } = parsed.data;
  const link = await db.accessLink.findUnique({ where: { code: normalizeCode(code) } });
  if (!link || link.revokedAt) {
    return NextResponse.json({ error: "This feedback link is not valid." }, { status: 404 });
  }
  await db.feedback.create({ data: { ...answers, linkId: link.id, linkLabel: link.label } });
  return NextResponse.json({ ok: true });
}
