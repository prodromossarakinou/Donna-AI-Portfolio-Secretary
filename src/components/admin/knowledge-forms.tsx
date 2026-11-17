"use client";

import { useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { deleteDoc, importFolder, restoreVersion, saveDocAction } from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ImportFolderButton() {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await importFolder();
          toast.success(
            `Imported: ${result.created} new, ${result.updated} updated, ${result.unchanged} unchanged` +
              (result.timelineImported ? " · timeline.json loaded" : ""),
          );
        })
      }
    >
      {pending ? "Importing…" : "Import /knowledge folder"}
    </Button>
  );
}

type Version = { id: string; title: string; createdAt: string; length: number };

export function DocEditor(props: {
  id: string;
  title: string;
  content: string;
  status: string;
  indexError: string | null;
  generatedFrom: string | null;
  versions: Version[];
}) {
  const [title, setTitle] = useState(props.title);
  const [content, setContent] = useState(props.content);
  const [status, setStatus] = useState(props.status);
  const [indexError, setIndexError] = useState(props.indexError);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      setStatus("INDEXING");
      const result = await saveDocAction({ id: props.id, content });
      if (!("status" in result) || !result.status) {
        toast.error(("error" in result && result.error) || "Save failed", { duration: 15000 });
        setStatus(props.status);
        return;
      }
      if (result.title) setTitle(result.title);
      if (result.warning) toast.error(result.warning, { duration: 15000 });
      setStatus(result.status);
      setIndexError(result.indexError ?? null);
      if (result.status === "READY") toast.success(result.changed ? "Saved and re-indexed" : "No changes");
      else toast.error("Saved, but indexing failed");
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-xs text-muted-foreground">The title is the first &quot;# &quot; line of the markdown.</p>
        </div>
        <Badge variant={status === "READY" ? "default" : status === "ERROR" ? "destructive" : "secondary"}>
          index: {status.toLowerCase()}
        </Badge>
        {!props.generatedFrom && (
          <Button onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save & re-index"}
          </Button>
        )}
        <Button
          variant="destructive"
          disabled={pending}
          onClick={() => {
            if (window.confirm("Delete this document and its history? This cannot be undone.")) {
              start(() => deleteDoc(props.id));
            }
          }}
        >
          Delete
        </Button>
      </div>
      {props.generatedFrom && (
        <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          This document is generated automatically from {props.generatedFrom} data. Edit it in Admin →{" "}
          {props.generatedFrom === "timeline" ? "Timeline" : "Projects"}; changes made here would be overwritten.
        </p>
      )}
      {indexError && <p className="text-sm text-destructive break-words">{indexError}</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="content">Markdown</Label>
          <Textarea
            id="content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="min-h-[28rem] font-mono text-sm"
            spellCheck={false}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Preview</Label>
          <div className="markdown min-h-[28rem] rounded-lg border bg-card p-4 text-sm overflow-auto">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || "_Nothing to preview._"}</ReactMarkdown>
          </div>
        </div>
      </div>
      <section className="space-y-2">
        <h2 className="text-sm font-medium">History</h2>
        {props.versions.length === 0 && <p className="text-sm text-muted-foreground">No earlier versions.</p>}
        <ul className="divide-y rounded-lg border">
          {props.versions.map((version) => (
            <li key={version.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <span>
                {version.createdAt} · {version.title} · {version.length} chars
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => {
                  if (window.confirm("Restore this version? The current text is kept in history.")) {
                    start(async () => {
                      await restoreVersion(version.id);
                      window.location.reload();
                    });
                  }
                }}
              >
                Restore
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
