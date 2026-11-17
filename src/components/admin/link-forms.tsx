"use client";

import { useActionState, useTransition } from "react";
import { toast } from "sonner";
import { createLink, deleteLink, extendLink, revokeLink, type CreateLinkState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyButton } from "./copy-button";

export function CreateLinkForm() {
  const [state, action, pending] = useActionState<CreateLinkState, FormData>(createLink, {});
  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <form action={action} className="grid gap-4 md:grid-cols-[1.2fr_1.6fr_110px_auto] md:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="label">Label (company / position)</Label>
          <Input id="label" name="label" required maxLength={120} placeholder="Acme — Tech Lead" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="note">Note (optional)</Label>
          <Input id="note" name="note" maxLength={300} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="days">Expiry (days)</Label>
          <Input id="days" name="days" type="number" min={1} max={365} defaultValue={7} />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create link"}
        </Button>
      </form>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.code && state.url && (
        <div className="rounded-lg border border-dashed p-4 space-y-3">
          <p className="text-sm text-muted-foreground">Created for {state.label}</p>
          <div className="flex flex-wrap items-center gap-3">
            <code className="font-mono text-lg tracking-wider">{state.code}</code>
            <CopyButton value={state.code} label="Copy code" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <code className="font-mono text-sm break-all">{state.url}</code>
            <CopyButton value={state.url} label="Copy URL" />
          </div>
        </div>
      )}
    </div>
  );
}

export function LinkActions({ id, label, revoked }: { id: string; label: string; revoked: boolean }) {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<void>, message: string) =>
    start(async () => {
      await fn();
      toast.success(message);
    });
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      <Button size="xs" variant="outline" disabled={pending} onClick={() => run(() => extendLink(id, 7), "Extended by 7 days")}>
        +7 days
      </Button>
      {!revoked && (
        <Button size="xs" variant="outline" disabled={pending} onClick={() => run(() => revokeLink(id), "Link revoked")}>
          Revoke
        </Button>
      )}
      <Button
        size="xs"
        variant="destructive"
        disabled={pending}
        onClick={() => {
          if (window.confirm(`Delete "${label}" with all its sessions and conversations? This cannot be undone.`)) {
            run(() => deleteLink(id), "Link deleted");
          }
        }}
      >
        Delete
      </Button>
    </div>
  );
}
