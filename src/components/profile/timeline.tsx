"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { TimelineStep } from "@/lib/settings";

type Step = TimelineStep & { projectSlug?: string };

function StepCard({ step, index }: { step: Step; index: number }) {
  const reduce = useReducedMotion();
  const dates = [step.start, step.end].filter(Boolean).join(" — ");
  return (
    <motion.li
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: "0px 0px -18% 0px" }}
      className="relative pl-10 md:pl-14"
    >
      <motion.span
        variants={{ hidden: { scale: 0, opacity: 0 }, shown: { scale: 1, opacity: 1 } }}
        transition={{ type: "spring", stiffness: 320, damping: 22 }}
        className="absolute left-0 top-1.5 grid size-[23px] place-items-center rounded-full border-2 border-primary bg-background font-mono text-[10px] text-primary"
      >
        {index + 1}
      </motion.span>
      <motion.div
        variants={{ hidden: { opacity: 0, x: reduce ? 0 : 28 }, shown: { opacity: 1, x: 0 } }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-2xl border bg-card p-5 md:p-6"
      >
        {dates && <p className="font-mono text-xs uppercase tracking-[0.15em] text-primary">{dates}</p>}
        <h3 className="mt-2 text-lg font-semibold leading-snug">{step.title}</h3>
        {step.organization && <p className="text-sm text-muted-foreground">{step.organization}</p>}
        {step.description && <p className="mt-3 text-sm leading-relaxed text-foreground/80">{step.description}</p>}
        {step.stack.length > 0 && (
          <motion.ul
            variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.06, delayChildren: 0.25 } } }}
            className="mt-4 flex flex-wrap gap-1.5"
          >
            {step.stack.map((item) => (
              <motion.li
                key={item}
                variants={{ hidden: { opacity: 0, y: reduce ? 0 : 6 }, shown: { opacity: 1, y: 0 } }}
                className="rounded-full border bg-muted px-2.5 py-0.5 font-mono text-xs"
              >
                {item}
              </motion.li>
            ))}
          </motion.ul>
        )}
        {step.projectSlug && (
          <Link
            href={`/projects#${step.projectSlug}`}
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            View project <ArrowRight className="size-4" />
          </Link>
        )}
      </motion.div>
    </motion.li>
  );
}

export function Timeline({ steps }: { steps: Step[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 60%"] });
  const scaleY = useSpring(scrollYProgress, { stiffness: 120, damping: 28, restDelta: 0.001 });
  if (steps.length === 0) return null;
  return (
    <section className="pb-40">
      <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">Involvement timeline</h2>
      <div ref={ref} className="relative mt-10">
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
        <motion.div style={{ scaleY }} className="absolute left-[11px] top-2 bottom-2 w-px origin-top bg-brand-gradient" />
        <ol className="space-y-8">
          {steps.map((step, index) => (
            <StepCard key={`${step.title}-${index}`} step={step} index={index} />
          ))}
        </ol>
      </div>
    </section>
  );
}
