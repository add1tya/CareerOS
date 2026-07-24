"use client";

/**
 * Decision Trace Narrator UI (ADR-0023).
 * Additive to structured Decision Explanation — never replaces it.
 */

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { NarrativeView } from "@/lib/decision-engine/trace-narrator-types";

const SECTION_TITLES: Record<string, string> = {
  overview: "Overview",
  whyThisSkill: "Why this skill",
  whyNow: "Why now",
  whyNotRunnerUp: "Why not the runner-up",
  ifSkipped: "If skipped or overridden",
  goalAlignment: "How it relates to the goal",
};

export function DecisionTraceNarrative({
  recommendationId,
}: {
  recommendationId: string;
}) {
  const [view, setView] = useState<NarrativeView | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/decision/narrate?recommendationId=${encodeURIComponent(recommendationId)}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const body = (await res.json()) as NarrativeView;
        if (!cancelled) setView(body);
      } catch {
        // ignore prefetch errors
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recommendationId]);

  async function generate() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/decision/narrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recommendationId }),
        cache: "no-store",
      });
      const body = (await res.json()) as NarrativeView & { error?: string };
      if (!res.ok) {
        setError(body.error ?? `Narration failed (${res.status}).`);
        return;
      }
      setView(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Narration failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed p-3">
      <div>
        <p className="text-sm font-medium">Narrative explanation</p>
        <p className="text-xs text-muted-foreground">
          Optional AI prose grounded in the structured facts above. Does not
          change the recommendation.
        </p>
      </div>

      {view?.status === "insufficient" ? (
        <p className="text-sm text-muted-foreground" role="status">
          {view.insufficientReason ??
            "Trace facts are insufficient for narration. AI was not called."}
        </p>
      ) : null}

      {view?.status === "ready" && view.narrative ? (
        <div className="space-y-3 text-sm">
          <p className="text-xs text-muted-foreground">{view.note}</p>
          {view.narrative.uncertaintyNote ? (
            <p className="text-xs text-muted-foreground">
              {view.narrative.uncertaintyNote}
            </p>
          ) : null}
          <dl className="space-y-3">
            {view.narrative.sections.map((section) => (
              <div key={section.key}>
                <dt className="font-medium">
                  {SECTION_TITLES[section.key] ?? section.key}
                </dt>
                <dd className="mt-1 text-muted-foreground">{section.prose}</dd>
                <dd className="mt-1 text-[10px] text-muted-foreground/80">
                  cites: {section.citationIds.join(", ")}
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-muted-foreground">
            Narrator v{view.narrative.traceNarratorVersion}
            {view.createdAt
              ? ` · ${new Date(view.createdAt).toLocaleString()}`
              : ""}
          </p>
        </div>
      ) : null}

      {view?.status !== "ready" && view?.status !== "insufficient" ? (
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => void generate()}
        >
          {pending ? "Generating…" : "Generate narrative explanation"}
        </Button>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
