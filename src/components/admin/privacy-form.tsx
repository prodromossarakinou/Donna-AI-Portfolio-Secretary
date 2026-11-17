"use client";

import { useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { resetPrivacyAction, savePrivacyAction } from "@/app/admin/actions";
import type { PrivacyContent } from "@/lib/privacy";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const LANGS = [
  { key: "en", label: "English" },
  { key: "el", label: "Ελληνικά" },
] as const;

export function PrivacyForm({ initial }: { initial: PrivacyContent }) {
  const [content, setContent] = useState(initial);
  const [lang, setLang] = useState<"en" | "el">("en");
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      const result = await savePrivacyAction(content);
      if (result.error) toast.error(result.error);
      else toast.success("Privacy page saved");
    });

  const reset = () => {
    if (!window.confirm("Replace both languages with the built-in default text?")) return;
    start(async () => {
      setContent(await resetPrivacyAction());
      toast.success("Default text restored");
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {LANGS.map((item) => (
          <Button key={item.key} variant={lang === item.key ? "default" : "outline"} onClick={() => setLang(item.key)}>
            {item.label}
          </Button>
        ))}
        <span className="flex-1" />
        <Button variant="outline" disabled={pending} onClick={reset}>
          Restore default
        </Button>
        <Button disabled={pending} onClick={save}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="privacy-text">Markdown</Label>
          <Textarea
            id="privacy-text"
            value={content[lang]}
            onChange={(event) => setContent({ ...content, [lang]: event.target.value })}
            className="min-h-[34rem] font-mono text-sm"
            spellCheck={false}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Preview</Label>
          <div className="policy min-h-[34rem] overflow-auto rounded-lg border bg-card p-5">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content[lang]}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
