import type { Metadata } from "next";
import Link from "next/link";
import { FeedbackForm } from "@/components/feedback-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { normalizeCode } from "@/lib/codes";
import { db } from "@/lib/db";
import { getOwner } from "@/lib/owner";

export const metadata: Metadata = { title: "Feedback" };

export const dynamic = "force-dynamic";

export default async function FeedbackPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [link, owner] = await Promise.all([
    db.accessLink.findUnique({ where: { code: normalizeCode(decodeURIComponent(code)) } }),
    getOwner(),
  ]);
  const valid = Boolean(link) && !link?.revokedAt;
  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-5">
          <Link href="/" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
            ← {owner.name}
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-5 py-12">
        {valid && link ? (
          <div className="space-y-10">
            <div className="space-y-3">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">Feedback</p>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">How was it?</h1>
              <p className="leading-relaxed text-foreground/80">
                Two minutes. Your answers help {owner.first} improve this profile and Donna. Four quick questions are
                required; the rest is optional.
              </p>
            </div>
            <FeedbackForm code={link.code} ownerFirst={owner.first} />
            <p className="text-xs text-muted-foreground">
              Your answers are stored together with the access link you were given.{" "}
              <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
                Privacy
              </Link>
            </p>
          </div>
        ) : (
          <div className="space-y-3 py-16 text-center">
            <h1 className="text-2xl font-semibold">This feedback link is not valid</h1>
            <p className="text-muted-foreground">Check the link you were given, or ask {owner.first} for a new one.</p>
          </div>
        )}
      </main>
    </>
  );
}
