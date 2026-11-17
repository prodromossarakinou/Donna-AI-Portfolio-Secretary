import type { Metadata } from "next";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ThemeToggle } from "@/components/theme-toggle";
import { getPrivacy } from "@/lib/privacy";

export const metadata: Metadata = { title: "Privacy" };

export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const content = await getPrivacy();
  return (
    <>
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-5">
          <Link href="/" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
            ← Back
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <a href="#en" className="underline-offset-4 hover:underline">
              English
            </a>
            <a href="#el" className="underline-offset-4 hover:underline">
              Ελληνικά
            </a>
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-20 px-5 py-14">
        <article id="en" lang="en" className="policy scroll-mt-20">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content.en}</ReactMarkdown>
        </article>
        <article id="el" lang="el" className="policy scroll-mt-20">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content.el}</ReactMarkdown>
        </article>
      </main>
    </>
  );
}
