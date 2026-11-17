"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ProfileData } from "@/lib/settings";

export function Hero({ data }: { data: ProfileData }) {
  const reduce = useReducedMotion();
  const rise = (delay: number) => ({
    initial: { opacity: 0, y: reduce ? 0 : 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
  });
  const { profile, status } = data;
  const rows = [
    { label: "Current role", value: status.role },
    { label: "Project", value: status.project },
    { label: "Focus", value: status.focus },
  ].filter((row) => row.value);

  return (
    <section className="grid gap-10 pt-16 pb-20 md:pt-24 lg:grid-cols-[1.25fr_1fr] lg:items-end">
      <div className="space-y-6">
        <motion.p {...rise(0)} className="font-mono text-xs uppercase tracking-[0.25em] text-primary">
          Professional profile
        </motion.p>
        <motion.h1 {...rise(0.08)} className="text-4xl font-bold tracking-tight text-balance sm:text-6xl">
          {profile.name}
        </motion.h1>
        <motion.p {...rise(0.16)} className="text-lg text-muted-foreground sm:text-xl">
          {profile.title}
        </motion.p>
        {profile.summary && (
          <motion.p {...rise(0.24)} className="max-w-xl leading-relaxed text-foreground/80">
            {profile.summary}
          </motion.p>
        )}
      </div>

      <motion.aside {...rise(0.32)} className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Current professional status
          </h2>
        </div>
        <dl className="mt-5 space-y-4">
          {rows.map((row) => (
            <div key={row.label}>
              <dt className="text-xs text-muted-foreground">{row.label}</dt>
              <dd className="mt-0.5 font-medium leading-snug">{row.value}</dd>
            </div>
          ))}
          {status.availability.length > 0 && (
            <div>
              <dt className="text-xs text-muted-foreground">Availability</dt>
              <dd className="mt-1.5 flex flex-wrap gap-1.5">
                {status.availability.map((item) => (
                  <span key={item} className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {item}
                  </span>
                ))}
              </dd>
            </div>
          )}
        </dl>
      </motion.aside>
    </section>
  );
}
