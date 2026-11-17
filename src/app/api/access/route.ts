import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { linkStatus, normalizeCode } from "@/lib/codes";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { clearVisitorCookie, createVisitorCookie } from "@/lib/visitor";

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  if (!rateLimit(`access:${ip}`, 5)) {
    return NextResponse.json({ error: "Too many attempts. Try again in a minute." }, { status: 429 });
  }
  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  const code = typeof body?.code === "string" ? normalizeCode(body.code) : "";
  if (!code || code.length > 32) {
    return NextResponse.json({ error: "Enter your access code." }, { status: 400 });
  }
  const link = await db.accessLink.findUnique({ where: { code } });
  if (!link || linkStatus(link) !== "active") {
    return NextResponse.json({ error: "This code is not valid or has expired." }, { status: 401 });
  }
  const session = await db.visitorSession.create({
    data: { linkId: link.id, ip, userAgent: request.headers.get("user-agent")?.slice(0, 300) },
  });
  await db.accessLink.update({ where: { id: link.id }, data: { lastAccessAt: new Date() } });
  await createVisitorCookie(session, link);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearVisitorCookie();
  return NextResponse.json({ ok: true });
}
