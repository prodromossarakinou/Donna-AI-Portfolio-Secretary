import { AccessGate } from "@/components/access-gate";
import { ChatPanel } from "@/components/chat-panel";
import { Landing } from "@/components/landing/landing";
import { SiteHeader } from "@/components/site-header";
import { getAbout } from "@/lib/generated";
import { getOwner, ownerFrom } from "@/lib/owner";
import { getProfileData } from "@/lib/settings";
import { getVisitor } from "@/lib/visitor";

export default async function Home({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const visitor = await getVisitor();
  if (!visitor) {
    const { code } = await searchParams;
    const owner = await getOwner();
    return <AccessGate name={owner.name} initialCode={typeof code === "string" ? code.slice(0, 32) : undefined} />;
  }
  const [data, about] = await Promise.all([getProfileData(), getAbout()]);
  const phrases = about.phrases.length
    ? about.phrases
    : data.profile.title
        .split(/[·|,/]/)
        .map((part) => part.trim())
        .filter(Boolean);
  return (
    <>
      <SiteHeader name={data.profile.name} active="home" />
      <Landing
        name={data.profile.name}
        firstName={ownerFrom(data.profile.name).first}
        phrases={phrases}
        summary={about.summary || data.profile.summary}
        facts={about.facts}
      />
      <ChatPanel ownerFirst={ownerFrom(data.profile.name).first} />
    </>
  );
}
