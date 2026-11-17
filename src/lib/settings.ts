import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { db } from "./db";

export const limitsSchema = z.object({
  maxMessagesPerDay: z.coerce.number().int().min(1).max(10000),
  maxTokensPerAnswer: z.coerce.number().int().min(100).max(4000),
  monthlyCostCapUsd: z.coerce.number().min(0).max(10000),
  ratePerMinute: z.coerce.number().int().min(1).max(600),
});

export type Limits = z.infer<typeof limitsSchema>;

function envNumber(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function defaultLimits(): Limits {
  return {
    maxMessagesPerDay: envNumber("MAX_MESSAGES_PER_DAY", 40),
    maxTokensPerAnswer: envNumber("MAX_TOKENS_PER_ANSWER", 600),
    monthlyCostCapUsd: envNumber("MONTHLY_COST_CAP_USD", 5),
    ratePerMinute: envNumber("RATE_LIMIT_PER_MINUTE", 10),
  };
}

export async function getLimits(): Promise<Limits> {
  const row = await db.setting.findUnique({ where: { key: "limits" } });
  const parsed = limitsSchema.safeParse({ ...defaultLimits(), ...((row?.value as object) ?? {}) });
  return parsed.success ? parsed.data : defaultLimits();
}

export async function saveLimits(limits: Limits) {
  await db.setting.upsert({
    where: { key: "limits" },
    create: { key: "limits", value: limits },
    update: { value: limits },
  });
}

export const timelineStepSchema = z.object({
  title: z.string().min(1),
  organization: z.string().default(""),
  start: z.string().default(""),
  end: z.string().default(""),
  description: z.string().default(""),
  stack: z.array(z.string()).default([]),
});

export const profileDataSchema = z.object({
  profile: z.object({
    name: z.string().default(""),
    title: z.string().default(""),
    summary: z.string().default(""),
  }),
  status: z.object({
    role: z.string().default(""),
    project: z.string().default(""),
    focus: z.string().default(""),
    availability: z.array(z.string()).default([]),
  }),
  timeline: z.array(timelineStepSchema).default([]),
});

export type ProfileData = z.infer<typeof profileDataSchema>;
export type TimelineStep = z.infer<typeof timelineStepSchema>;

const emptyProfile: ProfileData = {
  profile: { name: "", title: "", summary: "" },
  status: { role: "", project: "", focus: "", availability: [] },
  timeline: [],
};

export function knowledgeDir(): string {
  return path.join(process.cwd(), "knowledge");
}

export async function readTimelineFile(): Promise<ProfileData | null> {
  try {
    const raw = await fs.readFile(path.join(knowledgeDir(), "timeline.json"), "utf8");
    const parsed = profileDataSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function getProfileData(): Promise<ProfileData> {
  const row = await db.setting.findUnique({ where: { key: "timeline" } });
  if (row) {
    const parsed = profileDataSchema.safeParse(row.value);
    if (parsed.success) return parsed.data;
  }
  return (await readTimelineFile()) ?? emptyProfile;
}

export async function saveProfileData(data: ProfileData) {
  await db.setting.upsert({
    where: { key: "timeline" },
    create: { key: "timeline", value: data },
    update: { value: data },
  });
}
