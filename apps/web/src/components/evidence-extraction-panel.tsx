"use client";

/**
 * Evidence Extraction Assistant UI (ADR-0022).
 * Answers: "What Evidence does this artifact support, and do I accept it?"
 */

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { ExtractionProposalView } from "@/lib/evidence-extraction/proposal-view";
import { MAX_ARTIFACT_CHARS } from "@/lib/evidence-extraction/extraction-types";

type Selection = Record<
  string,
  { selected: boolean; impliedMastery: number }
>;

export function EvidenceExtractionPanel({
  initialSessions,
}: {
  initialSessions: Array<{
    id: string;
    status: string;
    createdAt: string;
    proposalCount: number;
  }>;
}) {
  const router = useRouter();
  const [artifactText, setArtifactText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ExtractionProposalView | null>(null);
  const [selection, setSelection] = useState<Selection>({});

  async function runExtract() {
    setPending(true);
    setError(null);
    setView(null);
    try {
      const res = await fetch("/api/evidence/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artifactText }),
        cache: "no-store",
      });
      const body = (await res.json()) as {
        view?: ExtractionProposalView;
        error?: string;
      };
      if (!res.ok || !body.view) {
        setError(body.error ?? `Extract failed (${res.status}).`);
        return;
      }
      setView(body.view);
      const next: Selection = {};
      for (const p of body.view.proposals) {
        next[p.proposalId] = {
          selected: true,
          impliedMastery: p.impliedMastery,
        };
      }
      setSelection(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extract failed.");
    } finally {
      setPending(false);
    }
  }

  async function confirm() {
    if (!view) return;
    const accepted = Object.entries(selection)
      .filter(([, v]) => v.selected)
      .map(([proposalId, v]) => ({
        proposalId,
        impliedMastery: v.impliedMastery,
      }));
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/evidence/extract/${view.sessionId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted }),
        cache: "no-store",
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Confirm failed.");
        return;
      }
      setView(null);
      setArtifactText("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirm failed.");
    } finally {
      setPending(false);
    }
  }

  async function decline() {
    if (!view) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/evidence/extract/${view.sessionId}/decline`, {
        method: "POST",
        cache: "no-store",
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Decline failed.");
        return;
      }
      setView(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decline failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Paste a learning artifact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Course notes, README excerpts, resume sections, certificates (text),
            or project descriptions. The assistant proposes Evidence — you
            confirm before anything is written.
          </p>
          <Label htmlFor="artifact">Artifact text</Label>
          <textarea
            id="artifact"
            value={artifactText}
            onChange={(e) => setArtifactText(e.target.value)}
            rows={10}
            maxLength={MAX_ARTIFACT_CHARS}
            className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            placeholder="Paste text exactly as you have it…"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {artifactText.length} / {MAX_ARTIFACT_CHARS}
            </span>
            <Button
              type="button"
              size="sm"
              disabled={pending || artifactText.length === 0}
              onClick={() => void runExtract()}
            >
              {pending && !view ? "Extracting…" : "Extract proposals"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {view ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Review proposals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">{view.note}</p>
            {view.overallNotes ? (
              <p className="rounded-lg border bg-muted/40 p-3 text-muted-foreground">
                {view.overallNotes}
              </p>
            ) : null}

            {view.proposals.length === 0 ? (
              <p className="text-muted-foreground">
                No grounded proposals. You can decline this session or try a
                clearer artifact with a live AI provider.
              </p>
            ) : (
              <ul className="space-y-3">
                {view.proposals.map((p) => {
                  const sel = selection[p.proposalId];
                  return (
                    <li
                      key={p.proposalId}
                      className="rounded-lg border bg-card/80 p-3 space-y-2"
                    >
                      <label className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={sel?.selected ?? false}
                          onChange={(e) =>
                            setSelection((prev) => ({
                              ...prev,
                              [p.proposalId]: {
                                selected: e.target.checked,
                                impliedMastery:
                                  prev[p.proposalId]?.impliedMastery ??
                                  p.impliedMastery,
                              },
                            }))
                          }
                        />
                        <span>
                          <span className="font-medium">{p.skillName}</span>
                          <span className="text-muted-foreground">
                            {" "}
                            · {p.evidenceType} · review confidence{" "}
                            {p.proposalConfidence}
                          </span>
                        </span>
                      </label>
                      <p className="text-muted-foreground pl-6">{p.summary}</p>
                      {p.quoteSpan ? (
                        <blockquote className="pl-6 text-xs text-muted-foreground border-l-2 ml-6">
                          {p.quoteSpan}
                        </blockquote>
                      ) : null}
                      <div className="pl-6 flex items-center gap-2">
                        <Label
                          htmlFor={`m-${p.proposalId}`}
                          className="text-xs"
                        >
                          Implied mastery
                        </Label>
                        <input
                          id={`m-${p.proposalId}`}
                          type="number"
                          min={0}
                          max={1}
                          step={0.05}
                          value={sel?.impliedMastery ?? p.impliedMastery}
                          onChange={(e) =>
                            setSelection((prev) => ({
                              ...prev,
                              [p.proposalId]: {
                                selected: prev[p.proposalId]?.selected ?? true,
                                impliedMastery: Number(e.target.value),
                              },
                            }))
                          }
                          className="border-input bg-background h-8 w-24 rounded-lg border px-2 text-sm"
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={
                  pending ||
                  !Object.values(selection).some((s) => s.selected)
                }
                onClick={() => void confirm()}
              >
                {pending ? "Saving…" : "Confirm selected"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => void decline()}
              >
                Decline all
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Session {view.sessionId.slice(0, 8)}… · extraction v
              {view.extractionVersion}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {initialSessions.length > 0 ? (
        <div className="space-y-2">
          <h2 className="text-sm font-medium">Recent sessions</h2>
          <ul className="text-sm text-muted-foreground space-y-1">
            {initialSessions.map((s) => (
              <li key={s.id}>
                {new Date(s.createdAt).toLocaleString()} · {s.status} ·{" "}
                {s.proposalCount} proposal(s)
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
