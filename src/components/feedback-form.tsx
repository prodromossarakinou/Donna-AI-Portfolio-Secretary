"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Choice = { value: string; label: string };

function Scale(props: { legend: string; low: string; high: string; value: number; onChange: (value: number) => void }) {
  return (
    <fieldset className="space-y-2">
      <legend className="font-medium">{props.legend}</legend>
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            type="button"
            aria-pressed={props.value === score}
            aria-label={`${score} out of 5`}
            onClick={() => props.onChange(score)}
            className={
              props.value === score
                ? "size-11 rounded-full border border-primary bg-primary font-semibold text-primary-foreground"
                : "size-11 rounded-full border bg-card font-semibold transition-colors hover:border-primary hover:text-primary"
            }
          >
            {score}
          </button>
        ))}
      </div>
      <p className="flex max-w-[17.5rem] justify-between text-xs text-muted-foreground">
        <span>{props.low}</span>
        <span>{props.high}</span>
      </p>
    </fieldset>
  );
}

function Options(props: { legend: string; choices: Choice[]; value: string; onChange: (value: string) => void }) {
  return (
    <fieldset className="space-y-2">
      <legend className="font-medium">{props.legend}</legend>
      <div className="flex flex-wrap gap-2">
        {props.choices.map((choice) => (
          <button
            key={choice.value}
            type="button"
            aria-pressed={props.value === choice.value}
            onClick={() => props.onChange(choice.value)}
            className={
              props.value === choice.value
                ? "rounded-full border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                : "rounded-full border bg-card px-4 py-2 text-sm transition-colors hover:border-primary hover:text-primary"
            }
          >
            {choice.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function FeedbackForm({ code, ownerFirst }: { code: string; ownerFirst: string }) {
  const [rating, setRating] = useState(0);
  const [ease, setEase] = useState(0);
  const [donnaHelpful, setDonnaHelpful] = useState("");
  const [wouldContact, setWouldContact] = useState("");
  const [missing, setMissing] = useState("");
  const [improve, setImprove] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const complete = rating > 0 && ease > 0 && donnaHelpful && wouldContact;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!complete) {
      setError("Please answer the four questions at the top.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, rating, ease, donnaHelpful, wouldContact, missing, improve, name, email }),
      });
      if (response.ok) {
        setDone(true);
        return;
      }
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Something went wrong. Please try again.");
    } catch {
      setError("Network error. Please try again.");
    }
    setPending(false);
  }

  if (done) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <h2 className="text-2xl font-semibold">Thank you</h2>
        <p className="mt-2 text-muted-foreground">Your feedback was saved. It goes straight to {ownerFirst}.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <Scale legend="Overall, how useful was this profile?" low="Not useful" high="Very useful" value={rating} onChange={setRating} />
      <Scale legend="How easy was it to find what you were looking for?" low="Hard" high="Easy" value={ease} onChange={setEase} />
      <Options
        legend="Did Donna answer your questions?"
        choices={[
          { value: "yes", label: "Yes" },
          { value: "partly", label: "Partly" },
          { value: "no", label: "No" },
        ]}
        value={donnaHelpful}
        onChange={setDonnaHelpful}
      />
      <Options
        legend={`Did it give you enough to decide whether to contact ${ownerFirst}?`}
        choices={[
          { value: "yes", label: "Yes" },
          { value: "maybe", label: "Not sure" },
          { value: "no", label: "No" },
        ]}
        value={wouldContact}
        onChange={setWouldContact}
      />
      <div className="space-y-2">
        <Label htmlFor="missing" className="text-base font-medium">
          What did you look for and not find? <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea id="missing" value={missing} maxLength={2000} onChange={(event) => setMissing(event.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="improve" className="text-base font-medium">
          What would you change or add? <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea id="improve" value={improve} maxLength={2000} onChange={(event) => setImprove(event.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">
            Your name or role <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input id="name" value={name} maxLength={120} autoComplete="name" onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">
            Email, if you want a reply <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input id="email" type="email" value={email} maxLength={200} autoComplete="email" onChange={(event) => setEmail(event.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Button type="submit" size="lg" className="h-11 px-6" disabled={pending}>
          {pending ? "Sending…" : "Send feedback"}
        </Button>
        <p role="alert" className="min-h-5 text-sm text-destructive">
          {error}
        </p>
      </div>
    </form>
  );
}
