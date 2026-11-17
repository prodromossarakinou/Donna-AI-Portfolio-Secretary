"use client";

import { useState, useTransition } from "react";
import { testDonna, type SandboxResult } from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SandboxForm() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<SandboxResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-6">
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          start(async () => setResult(await testDonna(question)));
        }}
      >
        <Input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask as a recruiter would…" />
        <Button type="submit" disabled={pending || !question.trim()}>
          {pending ? "Asking…" : "Ask"}
        </Button>
      </form>
      {result?.error && <p className="text-sm text-destructive break-words">{result.error}</p>}
      {result && !result.error && (
        <div className="space-y-6">
          <section className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-medium">Answer</h2>
              <Badge variant={result.refused ? "destructive" : "default"}>
                {result.refused ? "guard: out of scope" : "guard: in scope"}
              </Badge>
              <span className="font-mono text-xs text-muted-foreground">
                {result.inputTokens} in · {result.outputTokens} out · ${result.costUsd?.toFixed(5)}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm">{result.answer}</p>
          </section>
          <section className="space-y-3">
            <h2 className="font-medium">Retrieved chunks ({result.chunks?.length ?? 0})</h2>
            {result.chunks?.map((chunk, index) => (
              <div key={index} className="rounded-xl border p-4 space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{chunk.docTitle}</span>
                  <span className="font-mono">similarity {chunk.score.toFixed(3)}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm">{chunk.content}</p>
              </div>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
