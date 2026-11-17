"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Award, GraduationCap, Languages, ScrollText } from "lucide-react";
import type { EducationItem } from "@/lib/donna";

const ICONS = {
  degree: GraduationCap,
  certificate: ScrollText,
  language: Languages,
  award: Award,
  other: ScrollText,
} as const;

export function Education({ items }: { items: EducationItem[] }) {
  const reduce = useReducedMotion();
  if (items.length === 0) return null;
  return (
    <section className="pb-40">
      <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">Education &amp; certifications</h2>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => {
          const Icon = ICONS[item.kind] ?? ScrollText;
          return (
            <motion.li
              key={`${item.title}-${index}`}
              initial={{ opacity: 0, y: reduce ? 0 : 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px 0px -10% 0px" }}
              transition={{ duration: 0.45, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl border bg-card p-5"
            >
              <span className="grid size-9 place-items-center rounded-full bg-secondary text-secondary-foreground">
                <Icon className="size-4" />
              </span>
              <h3 className="mt-4 font-semibold leading-snug">{item.title}</h3>
              {item.issuer && <p className="mt-1 text-sm text-muted-foreground">{item.issuer}</p>}
              {item.year && <p className="mt-2 font-mono text-xs uppercase tracking-[0.15em] text-primary">{item.year}</p>}
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}
