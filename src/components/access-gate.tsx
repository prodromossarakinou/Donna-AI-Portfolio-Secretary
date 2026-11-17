"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";

export function AccessGate({ name, initialCode }: { name: string; initialCode?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const tried = useRef(false);

  const submit = useCallback(
    async (value: string) => {
      if (!value.trim()) return;
      setPending(true);
      setError(null);
      try {
        const response = await fetch("/api/access", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code: value }),
        });
        if (response.ok) {
          router.replace("/");
          router.refresh();
          return;
        }
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Something went wrong. Try again.");
      } catch {
        setError("Network error. Try again.");
      }
      setPending(false);
    },
    [router],
  );

  useEffect(() => {
    if (initialCode && !tried.current) {
      tried.current = true;
      void submit(initialCode);
    }
  }, [initialCode, submit]);

  return (
    <main className="relative min-h-dvh grid place-items-center px-6">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-sm space-y-8"
      >
        <div className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">Private profile</p>
          <h1 className="text-3xl font-semibold tracking-tight">{name}</h1>
          <p className="text-sm text-muted-foreground">
            This profile is shared by invitation. Enter the access code you received to continue.
          </p>
        </div>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submit(code);
          }}
        >
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="DONNA-XXXX"
            autoFocus
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-label="Access code"
            aria-invalid={Boolean(error)}
            className="h-12 text-center font-mono text-lg tracking-[0.2em]"
          />
          <Button type="submit" size="lg" className="h-11 w-full" disabled={pending || !code.trim()}>
            {pending ? "Checking…" : "Enter"}
          </Button>
          <p role="alert" className="min-h-5 text-sm text-destructive">
            {error}
          </p>
        </form>
        <p className="text-xs text-muted-foreground">
          Visits and chat questions are recorded.{" "}
          <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
            Privacy
          </Link>
        </p>
      </motion.div>
    </main>
  );
}
