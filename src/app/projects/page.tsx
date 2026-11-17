import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChatPanel } from "@/components/chat-panel";
import { ProjectGrid } from "@/components/profile/project-grid";
import { SiteHeader } from "@/components/site-header";
import { db } from "@/lib/db";
import { ownerFrom } from "@/lib/owner";
import { getProfileData } from "@/lib/settings";
import { getVisitor } from "@/lib/visitor";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const visitor = await getVisitor();
  if (!visitor) redirect("/");
  const [data, projects] = await Promise.all([
    getProfileData(),
    db.project.findMany({ where: { kind: "project", NOT: { summary: "" } }, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] }),
  ]);
  const owner = ownerFrom(data.profile.name);
  return (
    <>
      <SiteHeader name={data.profile.name} active="projects" />
      <main className="mx-auto max-w-5xl px-5 pb-40">
        <section className="space-y-4 pt-16 pb-12 md:pt-24">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">Projects</p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Work and stack</h1>
          <p className="max-w-xl leading-relaxed text-foreground/80">
            The projects {owner.first} has worked on and the technologies behind each. Pick a technology to see where it
            was used.
          </p>
        </section>
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">Projects will appear here soon.</p>
        ) : (
          <ProjectGrid
            projects={projects.map((project) => ({
              id: project.id,
              slug: project.slug,
              name: project.name,
              organization: project.organization,
              period: [project.start, project.end].filter(Boolean).join(" — "),
              role: project.role,
              summary: project.summary,
              contributions: [],
              stack: project.stack,
              url: /^https?:\/\//.test(project.url) ? project.url : "",
            }))}
          />
        )}
      </main>
      <ChatPanel ownerFirst={owner.first} />
    </>
  );
}
