import { randomInt } from "crypto";
import type { AccessLink } from "@prisma/client";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateCode(): string {
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += ALPHABET[randomInt(ALPHABET.length)];
  return `DONNA-${suffix}`;
}

export function normalizeCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

export type LinkStatus = "active" | "expired" | "revoked";

export function linkStatus(link: Pick<AccessLink, "expiresAt" | "revokedAt">): LinkStatus {
  if (link.revokedAt) return "revoked";
  if (link.expiresAt.getTime() <= Date.now()) return "expired";
  return "active";
}

export function appUrl(): string {
  return (process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function shareUrl(code: string): string {
  return `${appUrl()}/?code=${encodeURIComponent(code)}`;
}
