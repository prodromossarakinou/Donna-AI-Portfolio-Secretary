import { requireAdmin } from "@/lib/admin";
import { getProfileData } from "@/lib/settings";
import { TimelineForm } from "@/components/admin/timeline-form";

export default async function TimelinePage() {
  await requireAdmin();
  const data = await getProfileData();
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Timeline & status</h1>
        <p className="text-sm text-muted-foreground">Drives the hero, the status card and the timeline. A step whose title contains a project name links to that project.</p>
      </header>
      <TimelineForm initial={data} />
    </div>
  );
}
