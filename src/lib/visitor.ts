import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { AccessLink, VisitorSession } from "@prisma/client";
import { db } from "./db";
import { linkStatus } from "./codes";

export const VISITOR_COOKIE = "donna_session";

function secret(): Uint8Array {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 16) throw new Error("SESSION_SECRET is missing or too short");
  return new TextEncoder().encode(value);
}

export async function createVisitorCookie(session: VisitorSession, link: AccessLink) {
  const token = await new SignJWT({ sid: session.id, lid: link.id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(link.expiresAt)
    .sign(secret());
  const store = await cookies();
  store.set(VISITOR_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: link.expiresAt,
  });
}

export async function clearVisitorCookie() {
  const store = await cookies();
  store.delete(VISITOR_COOKIE);
}

export type Visitor = { link: AccessLink; session: VisitorSession };

export async function getVisitor(): Promise<Visitor | null> {
  const store = await cookies();
  const token = store.get(VISITOR_COOKIE)?.value;
  if (!token) return null;
  let sid: string;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    sid = String(payload.sid);
  } catch {
    return null;
  }
  const session = await db.visitorSession.findUnique({ where: { id: sid }, include: { link: true } });
  if (!session || linkStatus(session.link) !== "active") return null;
  const { link, ...rest } = session;
  return { link, session: rest };
}
