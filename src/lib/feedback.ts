import { z } from "zod";
import { appUrl } from "./codes";

export const HELPFUL = ["yes", "partly", "no"] as const;
export const CONTACT = ["yes", "maybe", "no"] as const;

export const feedbackSchema = z.object({
  code: z.string().trim().min(1).max(32),
  rating: z.coerce.number().int().min(1).max(5),
  ease: z.coerce.number().int().min(1).max(5),
  donnaHelpful: z.enum(HELPFUL),
  wouldContact: z.enum(CONTACT),
  missing: z.string().trim().max(2000).default(""),
  improve: z.string().trim().max(2000).default(""),
  name: z.string().trim().max(120).default(""),
  email: z.union([z.literal(""), z.string().trim().email().max(200)]).default(""),
});

export function feedbackUrl(code: string): string {
  return `${appUrl()}/feedback/${encodeURIComponent(code)}`;
}
