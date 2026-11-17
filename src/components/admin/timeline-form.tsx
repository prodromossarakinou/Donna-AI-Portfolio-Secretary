"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { saveTimeline } from "@/app/admin/actions";
import type { ProfileData, TimelineStep } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const emptyStep: TimelineStep = { title: "", organization: "", start: "", end: "", description: "", stack: [] };

function Field(props: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{props.label}</Label>
      <Input value={props.value} placeholder={props.placeholder} onChange={(event) => props.onChange(event.target.value)} />
    </div>
  );
}

function toList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function TimelineForm({ initial }: { initial: ProfileData }) {
  const [data, setData] = useState(initial);
  const [stackText, setStackText] = useState(initial.timeline.map((step) => step.stack.join(", ")));
  const [availabilityText, setAvailabilityText] = useState(initial.status.availability.join(", "));
  const [pending, start] = useTransition();

  const setProfile = (patch: Partial<ProfileData["profile"]>) => setData({ ...data, profile: { ...data.profile, ...patch } });
  const setStatus = (patch: Partial<ProfileData["status"]>) => setData({ ...data, status: { ...data.status, ...patch } });
  const setStep = (index: number, patch: Partial<TimelineStep>) =>
    setData({ ...data, timeline: data.timeline.map((step, i) => (i === index ? { ...step, ...patch } : step)) });

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= data.timeline.length) return;
    const steps = [...data.timeline];
    const texts = [...stackText];
    [steps[index], steps[target]] = [steps[target], steps[index]];
    [texts[index], texts[target]] = [texts[target], texts[index]];
    setData({ ...data, timeline: steps });
    setStackText(texts);
  };

  const submit = () =>
    start(async () => {
      const payload: ProfileData = {
        ...data,
        status: { ...data.status, availability: toList(availabilityText) },
        timeline: data.timeline.map((step, i) => ({ ...step, stack: toList(stackText[i] ?? "") })),
      };
      const result = await saveTimeline(payload);
      if ("error" in result && result.error) toast.error(result.error);
      else toast.success("Timeline saved — page and Donna's knowledge updated");
    });

  return (
    <div className="space-y-8">
      <section className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="font-medium">Profile</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Name" value={data.profile.name} onChange={(name) => setProfile({ name })} />
          <Field label="Title" value={data.profile.title} onChange={(title) => setProfile({ title })} />
        </div>
        <div className="space-y-1.5">
          <Label>Summary</Label>
          <Textarea value={data.profile.summary} onChange={(event) => setProfile({ summary: event.target.value })} />
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="font-medium">Current professional status</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Current role" value={data.status.role} onChange={(role) => setStatus({ role })} />
          <Field label="Project" value={data.status.project} onChange={(project) => setStatus({ project })} />
          <Field label="Focus" value={data.status.focus} onChange={(focus) => setStatus({ focus })} />
          <Field label="Availability (comma separated)" value={availabilityText} onChange={setAvailabilityText} placeholder="Remote, Hybrid" />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-medium">Timeline steps (top = most recent)</h2>
            <p className="text-xs text-muted-foreground">
              Write the title as &quot;Role · Project name&quot;. When the project name matches a project document, the
              step links to it.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setData({ ...data, timeline: [{ ...emptyStep }, ...data.timeline] });
              setStackText(["", ...stackText]);
            }}
          >
            <Plus /> Add step
          </Button>
        </div>
        {data.timeline.map((step, index) => (
          <div key={index} className="rounded-xl border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-muted-foreground">Step {index + 1}</span>
              <div className="flex gap-1.5">
                <Button size="icon-sm" variant="outline" aria-label="Move up" onClick={() => move(index, -1)}>
                  <ArrowUp />
                </Button>
                <Button size="icon-sm" variant="outline" aria-label="Move down" onClick={() => move(index, 1)}>
                  <ArrowDown />
                </Button>
                <Button
                  size="icon-sm"
                  variant="destructive"
                  aria-label="Remove step"
                  onClick={() => {
                    if (!window.confirm("Remove this step?")) return;
                    setData({ ...data, timeline: data.timeline.filter((_, i) => i !== index) });
                    setStackText(stackText.filter((_, i) => i !== index));
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Role · Project" value={step.title} onChange={(title) => setStep(index, { title })} />
              <Field label="Organization" value={step.organization} onChange={(organization) => setStep(index, { organization })} />
              <Field label="Start" value={step.start} onChange={(value) => setStep(index, { start: value })} placeholder="04/2026" />
              <Field label="End" value={step.end} onChange={(end) => setStep(index, { end })} placeholder="Present" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={step.description} onChange={(event) => setStep(index, { description: event.target.value })} />
            </div>
            <Field
              label="Stack chips (comma separated)"
              value={stackText[index] ?? ""}
              onChange={(value) => setStackText(stackText.map((text, i) => (i === index ? value : text)))}
            />
          </div>
        ))}
      </section>

      <Button onClick={submit} disabled={pending}>
        {pending ? "Saving…" : "Save timeline"}
      </Button>
    </div>
  );
}
