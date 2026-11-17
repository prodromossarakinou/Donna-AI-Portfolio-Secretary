"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Briefcase, GraduationCap, MessageCircle, Route, Sparkles, User } from "lucide-react";

type Fact = { label: string; value: string };
type Topic = "who" | "about" | "portfolio" | "donna";


function askDonna(question?: string) {
  window.dispatchEvent(new CustomEvent("donna:open", { detail: question }));
}

function Typewriter({ phrases }: { phrases: string[] }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [length, setLength] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const phrase = phrases[index % phrases.length] ?? "";

  useEffect(() => {
    if (reduce) {
      const timer = setTimeout(() => setIndex((value) => value + 1), 2600);
      return () => clearTimeout(timer);
    }
    const atEnd = length === phrase.length;
    const delay = !deleting && atEnd ? 1700 : deleting ? 32 : 68;
    const timer = setTimeout(() => {
      if (!deleting && atEnd) setDeleting(true);
      else if (deleting && length === 0) {
        setDeleting(false);
        setIndex((value) => value + 1);
      } else setLength((value) => value + (deleting ? -1 : 1));
    }, delay);
    return () => clearTimeout(timer);
  }, [deleting, length, phrase, reduce]);

  return (
    <span className="text-brand-gradient">
      {reduce ? phrase : phrase.slice(0, length)}
      {!reduce && <span className="ml-1 inline-block h-[0.9em] w-[3px] translate-y-[0.1em] animate-pulse bg-primary" />}
    </span>
  );
}

const stage = {
  initial: { opacity: 0, y: 24, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -24, filter: "blur(6px)" },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
};

export function Landing(props: { name: string; firstName: string; phrases: string[]; summary: string; facts: Fact[] }) {
  const questions = [
    `Tell me about ${props.firstName}`,
    `What kind of work does ${props.firstName} do?`,
    `What is ${props.firstName} looking for next?`,
  ];
  const [topic, setTopic] = useState<Topic>("who");
  const phrases = props.phrases.length ? props.phrases : [props.name];
  const topics: { key: Topic; label: string; icon: typeof User }[] = [
    { key: "who", label: "Who am I", icon: Sparkles },
    ...(props.facts.length ? [{ key: "about" as const, label: "About me", icon: User }] : []),
    { key: "portfolio", label: "My work", icon: Briefcase },
    { key: "donna", label: "Ask Donna", icon: MessageCircle },
  ];

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-5xl flex-col px-5 py-8 md:h-[calc(100dvh-3.5rem)] md:overflow-hidden md:py-10">
      <div className="flex flex-1 items-center">
        <AnimatePresence mode="wait">
          {topic === "who" && (
            <motion.section key="who" {...stage} className="w-full space-y-6">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">Who am I?</p>
              <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
                {props.name}
                <span className="mt-2 block min-h-[1.2em] text-3xl sm:text-5xl">
                  <Typewriter phrases={phrases} />
                </span>
              </h1>
              {props.summary && <p className="max-w-2xl text-lg leading-relaxed text-foreground/80">{props.summary}</p>}
            </motion.section>
          )}

          {topic === "about" && (
            <motion.section key="about" {...stage} className="w-full space-y-6">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">About me</p>
              <motion.dl
                initial="hidden"
                animate="shown"
                variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } } }}
                className="grid gap-4 sm:grid-cols-2"
              >
                {props.facts.map((fact) => (
                  <motion.div
                    key={fact.label}
                    variants={{ hidden: { opacity: 0, x: -18 }, shown: { opacity: 1, x: 0 } }}
                    className="rounded-2xl border bg-card p-5"
                  >
                    <dt className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">{fact.label}</dt>
                    <dd className="mt-2 text-lg font-medium leading-snug">{fact.value}</dd>
                  </motion.div>
                ))}
              </motion.dl>
            </motion.section>
          )}

          {topic === "portfolio" && (
            <motion.section key="portfolio" {...stage} className="w-full space-y-6">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">My work</p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">Where do you want to start?</h2>
              <motion.div
                initial="hidden"
                animate="shown"
                variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } } }}
                className="grid gap-4 sm:grid-cols-3"
              >
                {[
                  { href: "/profile", title: "Career timeline", text: "Roles and periods, most recent first.", icon: Route },
                  { href: "/projects", title: "Projects & stack", text: "What I built and the technology behind it.", icon: Briefcase },
                  { href: "/profile#education", title: "Education", text: "Degree and certifications.", icon: GraduationCap },
                ].map((card) => (
                  <motion.div key={card.href} variants={{ hidden: { opacity: 0, y: 18 }, shown: { opacity: 1, y: 0 } }}>
                    <Link
                      href={card.href}
                      className="group flex h-full flex-col rounded-2xl border bg-card p-5 transition-colors hover:border-primary"
                    >
                      <span className="grid size-10 place-items-center rounded-full bg-secondary text-secondary-foreground">
                        <card.icon className="size-5" />
                      </span>
                      <span className="mt-4 text-lg font-semibold">{card.title}</span>
                      <span className="mt-1 text-sm text-muted-foreground">{card.text}</span>
                      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                        Open <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            </motion.section>
          )}

          {topic === "donna" && (
            <motion.section key="donna" {...stage} className="w-full space-y-6">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">Ask Donna</p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">Prefer to just ask?</h2>
              <p className="max-w-2xl text-lg leading-relaxed text-foreground/80">
                Donna is my AI secretary. She answers questions about my work and background, in English or Greek.
              </p>
              <motion.div
                initial="hidden"
                animate="shown"
                variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } } }}
                className="flex flex-col items-start gap-2"
              >
                {questions.map((question) => (
                  <motion.button
                    key={question}
                    type="button"
                    variants={{ hidden: { opacity: 0, x: -18 }, shown: { opacity: 1, x: 0 } }}
                    onClick={() => askDonna(question)}
                    className="rounded-2xl rounded-bl-md border bg-card px-4 py-2.5 text-left transition-colors hover:border-primary hover:text-primary"
                  >
                    {question}
                  </motion.button>
                ))}
              </motion.div>
              <button
                type="button"
                onClick={() => askDonna()}
                className="inline-flex items-center gap-2 rounded-full bg-brand-gradient px-5 py-3 font-medium text-white shadow-lg"
              >
                <MessageCircle className="size-5" /> Open the chat
              </button>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      <nav aria-label="What do you want to see?" className="mt-8 space-y-3 pb-16 md:pb-4">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">What do you want to see?</p>
        <div className="flex flex-wrap gap-2">
          {topics.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={topic === item.key}
              onClick={() => setTopic(item.key)}
              className={
                topic === item.key
                  ? "inline-flex items-center gap-2 rounded-full border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                  : "inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm transition-colors hover:border-primary hover:text-primary"
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}
