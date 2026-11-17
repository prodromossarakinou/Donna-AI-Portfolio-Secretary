"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, SendHorizontal, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Message = { role: "user" | "assistant"; content: string };


export function ChatPanel({ ownerFirst }: { ownerFirst: string }) {
  const starters = [`Tell me about ${ownerFirst}`, `What kind of work does ${ownerFirst} do?`, `What is ${ownerFirst} looking for next?`];
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages, open]);

  const sendRef = useRef<(text: string) => void>(() => {});

  useEffect(() => {
    const onOpen = (event: Event) => {
      setOpen(true);
      const question = (event as CustomEvent<string | undefined>).detail;
      if (question) sendRef.current(question);
    };
    window.addEventListener("donna:open", onOpen);
    return () => window.removeEventListener("donna:open", onOpen);
  }, []);


  const setLast = (content: string) =>
    setMessages((current) => [...current.slice(0, -1), { role: "assistant", content }]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    const history = messages.filter((message) => message.content);
    setMessages([...messages, { role: "user", content: question }, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: question, history }),
      });
      if (response.status === 401) {
        setLast("Your access has expired. Please reload the page and enter your code again.");
      } else if (response.headers.get("content-type")?.includes("application/json")) {
        const body = (await response.json()) as { error?: string };
        setLast(body.error ?? "Something went wrong. Please try again.");
      } else if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let answer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          answer += decoder.decode(value, { stream: true });
          setLast(answer);
        }
        if (!answer) setLast("Something went wrong. Please try again.");
      }
    } catch {
      setLast("Network error. Please try again.");
    }
    setBusy(false);
  }

  useEffect(() => {
    sendRef.current = (text: string) => void send(text);
  });

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Ask Donna"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed inset-x-3 bottom-3 top-16 z-50 flex origin-bottom-right flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[min(620px,calc(100dvh-3rem))] sm:w-[400px]"
          >
            <header className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-brand-gradient font-semibold text-white">D</span>
                <div>
                  <p className="font-semibold leading-tight">Donna</p>
                  <p className="text-xs text-muted-foreground">{ownerFirst}&apos;s AI secretary</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" aria-label="Close chat" onClick={() => setOpen(false)}>
                <X />
              </Button>
            </header>

            <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.length === 0 && (
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Hello — I can answer questions about {ownerFirst}&apos;s experience, projects, skills and availability, in
                    English or Greek.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {starters.map((starter) => (
                      <button
                        key={starter}
                        type="button"
                        onClick={() => void send(starter)}
                        className="rounded-full border px-3 py-1.5 text-left text-sm transition-colors hover:border-primary hover:text-primary"
                      >
                        {starter}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((message, index) =>
                message.role === "user" ? (
                  <div key={index} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm text-primary-foreground">
                    {message.content}
                  </div>
                ) : (
                  <div key={index} className="markdown w-fit max-w-[90%] rounded-2xl rounded-bl-md bg-muted px-3.5 py-2 text-sm leading-relaxed">
                    {message.content ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                    ) : (
                      <span className="inline-flex gap-1 py-1.5" aria-label="Donna is typing">
                        {[0, 1, 2].map((dot) => (
                          <span
                            key={dot}
                            className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70"
                            style={{ animationDelay: `${dot * 120}ms` }}
                          />
                        ))}
                      </span>
                    )}
                  </div>
                ),
              )}
            </div>

            <form
              className="flex gap-2 border-t p-3"
              onSubmit={(event) => {
                event.preventDefault();
                void send(input);
              }}
            >
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about his professional profile…"
                maxLength={1000}
                aria-label="Message"
                className="h-10"
              />
              <Button type="submit" size="icon" className="size-10" aria-label="Send" disabled={busy || !input.trim()}>
                <SendHorizontal />
              </Button>
            </form>
            <p className="border-t px-4 py-2 text-[11px] leading-snug text-muted-foreground">
              Donna is an AI and can make mistakes. Questions are recorded.{" "}
              <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
                Privacy
              </Link>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {!open && (
        <motion.button
          type="button"
          onClick={() => setOpen(true)}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-brand-gradient px-5 py-3 font-medium text-white shadow-lg sm:bottom-6 sm:right-6"
        >
          <MessageCircle className="size-5" />
          Ask Donna
        </motion.button>
      )}
    </>
  );
}
