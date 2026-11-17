"use client";

import { useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { askGaps } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Message = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "What information is missing, based on what visitors asked?",
  "Which projects are missing or thin?",
  "Τι πληροφορία λείπει από το knowledge;",
];

export function GapsChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const send = (text: string) => {
    const question = text.trim();
    if (!question || pending) return;
    const next: Message[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setInput("");
    setError(null);
    start(async () => {
      const result = await askGaps(next);
      if (result.error || !result.answer) setError(result.error ?? "No answer.");
      else setMessages([...next, { role: "assistant", content: result.answer }]);
    });
  };

  return (
    <div className="space-y-5">
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {STARTERS.map((starter) => (
            <button
              key={starter}
              type="button"
              onClick={() => send(starter)}
              className="rounded-full border px-3 py-1.5 text-left text-sm transition-colors hover:border-primary hover:text-primary"
            >
              {starter}
            </button>
          ))}
        </div>
      )}
      <div className="space-y-3">
        {messages.map((message, index) =>
          message.role === "user" ? (
            <div key={index} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm text-primary-foreground">
              {message.content}
            </div>
          ) : (
            <div key={index} className="markdown max-w-3xl rounded-2xl rounded-bl-md border bg-card px-4 py-3 text-sm leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>
          ),
        )}
        {pending && <p className="text-sm text-muted-foreground">Donna is reviewing the knowledge and the recent questions…</p>}
        {error && <p className="text-sm text-destructive break-words">{error}</p>}
      </div>
      <form
        className="flex max-w-3xl gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          send(input);
        }}
      >
        <Input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask Donna what is missing…" />
        <Button type="submit" disabled={pending || !input.trim()}>
          Ask
        </Button>
      </form>
    </div>
  );
}
