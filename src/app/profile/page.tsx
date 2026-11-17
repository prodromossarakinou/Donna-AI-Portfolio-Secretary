import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChatPanel } from "@/components/chat-panel";
import { Education } from "@/components/profile/education";
import { Hero } from "@/components/profile/hero";
import { Timeline } from "@/components/profile/timeline";
import { SiteHeader } from "@/components/site-header";
import { getEducation, getTimelineSteps } from "@/lib/generated";
import { ownerFrom } from "@/lib/owner";
import { getProfileData } from "@/lib/settings";
import { getVisitor } from "@/lib/visitor";

export const metadata: Metadata = { title: "Portfolio" };

export default async function ProfilePage() {
  const visitor = await getVisitor();
  if (!visitor) redirect("/");
  const [data, education, steps] = await Promise.all([getProfileData(), getEducation(), getTimelineSteps()]);
  return (
    <>
      <SiteHeader name={data.profile.name} active="portfolio" feedbackHref={`/feedback/${visitor.link.code}`} />
      <main className="mx-auto max-w-5xl px-5">
        <Hero data={data} />
        <Timeline steps={steps} />
        <div id="education" className="scroll-mt-20">
          <Education items={education} />
        </div>
      </main>
      <ChatPanel ownerFirst={ownerFrom(data.profile.name).first} />
    </>
  );
}
