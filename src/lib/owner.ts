import { getProfileData } from "./settings";

export type Owner = { name: string; first: string; email: string; pronouns: string };

const FALLBACK_NAME = "the profile owner";

export function ownerFrom(name: string): Owner {
  const clean = name.trim() || process.env.OWNER_NAME?.trim() || FALLBACK_NAME;
  return {
    name: clean,
    first: clean === FALLBACK_NAME ? clean : clean.split(/\s+/)[0],
    email: process.env.OWNER_EMAIL?.trim() ?? "",
    pronouns: process.env.OWNER_PRONOUNS?.trim() || "he/him",
  };
}

export async function getOwner(): Promise<Owner> {
  try {
    return ownerFrom((await getProfileData()).profile.name);
  } catch {
    return ownerFrom("");
  }
}

export function fillOwner(template: string, owner: Owner): string {
  return template.replaceAll("{{OWNER}}", owner.name).replaceAll("{{FIRST}}", owner.first).replaceAll("{{PRONOUNS}}", owner.pronouns);
}
