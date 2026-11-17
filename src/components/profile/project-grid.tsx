"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Scale } from "lucide-react";

export type ProjectCard = {
  id: string;
  slug: string;
  name: string;
  organization: string;
  period: string;
  role: string;
  summary: string;
  contributions: string[];
  stack: string[];
  url: string;
  license: string;
};

export function ProjectGrid({ projects }: { projects: ProjectCard[] }) {
  const [active, setActive] = useState<string | null>(null);
  const techs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const project of projects) for (const tech of project.stack) counts.set(tech, (counts.get(tech) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [projects]);
  const visible = active ? projects.filter((project) => project.stack.includes(active)) : projects;

  const chip = (selected: boolean) =>
    selected
      ? "rounded-full border border-primary bg-primary px-3 py-1 font-mono text-xs text-primary-foreground"
      : "rounded-full border bg-muted px-3 py-1 font-mono text-xs transition-colors hover:border-primary hover:text-primary";

  return (
    <div className="space-y-10">
      {techs.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by technology">
          <button type="button" className={chip(active === null)} aria-pressed={active === null} onClick={() => setActive(null)}>
            All · {projects.length}
          </button>
          {techs.map(([tech, count]) => (
            <button
              key={tech}
              type="button"
              className={chip(active === tech)}
              aria-pressed={active === tech}
              onClick={() => setActive(active === tech ? null : tech)}
            >
              {tech} · {count}
            </button>
          ))}
        </div>
      )}
      <div className="grid gap-5 md:grid-cols-2">
        <AnimatePresence mode="popLayout">
          {visible.map((project) => (
            <motion.article
              key={project.id}
              id={project.slug}
              layout
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex scroll-mt-24 flex-col rounded-2xl border bg-card p-6 target:border-primary"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                {project.period ? (
                  <p className="font-mono text-xs uppercase tracking-[0.15em] text-primary">{project.period}</p>
                ) : (
                  <span />
                )}
                {project.license && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.1em] text-primary">
                    <Scale className="size-3" />
                    Open source · {project.license}
                  </span>
                )}
              </div>
              <h2 className="mt-2 text-xl font-semibold leading-snug">{project.name}</h2>
              <p className="text-sm text-muted-foreground">
                {[project.role, project.organization].filter(Boolean).join(" · ")}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-foreground/80">{project.summary}</p>
              {project.contributions.length > 0 && (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed text-foreground/80">
                  {project.contributions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              <div className="mt-auto pt-5">
                <ul className="flex flex-wrap gap-1.5">
                  {project.stack.map((tech) => (
                    <li
                      key={tech}
                      className={
                        tech === active
                          ? "rounded-full border border-primary/50 bg-primary/10 px-2.5 py-0.5 font-mono text-xs text-primary"
                          : "rounded-full border bg-muted px-2.5 py-0.5 font-mono text-xs"
                      }
                    >
                      {tech}
                    </li>
                  ))}
                </ul>
                {project.url && (
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {project.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    <ArrowUpRight className="size-4" />
                  </a>
                )}
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
