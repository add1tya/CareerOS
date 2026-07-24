"use client";

/**
 * Resume Intelligence UI (ADR-0024).
 * Answers: "What resume prose can CareerOS honestly support from my graph?"
 */

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ResumeView } from "@/lib/resume-intelligence/resume-intelligence-types";

type DraftListItem = {
  id: string;
  createdAt: string;
  resumeIntelligenceVersion: number;
};

const SECTION_LABELS: Record<string, string> = {
  headline: "Headline",
  summary: "Summary",
  skills: "Skills",
  experience: "Experience",
  education: "Education",
  currentFocus: "Current focus",
};

export function ResumeIntelligencePanel({
  initialPreview,
  initialDrafts,
}: {
  initialPreview: ResumeView;
  initialDrafts: DraftListItem[];
}) {
  const [preview, setPreview] = useState(initialPreview);
  const [drafts, setDrafts] = useState(initialDrafts);
  const [view, setView] = useState<ResumeView | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function compose() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/resume/compose", {
        method: "POST",
        cache: "no-store",
      });
      const body = (await res.json()) as ResumeView & {
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        setError(body.error ?? `Compose failed (${res.status}).`);
        return;
      }
      setView(body);
      if (body.status === "ready" && body.draftId && body.createdAt) {
        setDrafts((prev) => [
          {
            id: body.draftId!,
            createdAt: body.createdAt!,
            resumeIntelligenceVersion:
              body.draft?.resumeIntelligenceVersion ?? 1,
          },
          ...prev.filter((d) => d.id !== body.draftId),
        ]);
      }
      if (body.facts) {
        setPreview({
          ...body,
          draft: null,
          draftId: null,
          createdAt: null,
          status: body.facts.sufficient ? "missing" : "insufficient",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compose failed.");
    } finally {
      setPending(false);
    }
  }

  async function loadDraft(id: string) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/resume/drafts/${id}`, { cache: "no-store" });
      const body = (await res.json()) as ResumeView & { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Failed to load draft.");
        return;
      }
      setView(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load draft.");
    } finally {
      setPending(false);
    }
  }

  const facts = view?.facts ?? preview.facts;
  const sections = view?.sections ?? preview.sections;
  const draft = view?.status === "ready" ? view.draft : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resume Facts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Deterministic atoms from your Career Graph. Compose never invents
            missing experience. Export remains a separate ownership dump.
          </p>
          {!facts?.sufficient ? (
            <p className="text-amber-700 dark:text-amber-400">
              {facts?.insufficientReason ??
                preview.insufficientReason ??
                "Insufficient facts for compose."}
            </p>
          ) : null}
          {facts?.atoms?.length ? (
            <ul className="max-h-64 space-y-1 overflow-y-auto font-mono text-xs">
              {facts.atoms.map((atom) => (
                <li key={atom.id}>
                  <span className="text-muted-foreground">{atom.id}</span>
                  {": "}
                  {atom.value}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No facts assembled yet.</p>
          )}
          {sections ? (
            <div className="space-y-1 border-t pt-3">
              <p className="font-medium">Section plan</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {sections.sections.map((s) => (
                  <li key={s.key}>
                    {SECTION_LABELS[s.key] ?? s.key}: {s.status}
                    {s.unavailableMessage ? ` — ${s.unavailableMessage}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <Button
            type="button"
            onClick={() => void compose()}
            disabled={pending || !facts?.sufficient}
          >
            {pending ? "Composing…" : "Compose resume draft"}
          </Button>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {draft ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Draft</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {draft.sections.map((section) => {
              if (section.status === "omitted") return null;
              const title = SECTION_LABELS[section.key] ?? section.key;
              if (section.status === "unavailable") {
                return (
                  <div key={section.key}>
                    <h3 className="font-medium">{title}</h3>
                    <p className="text-muted-foreground">
                      {section.unavailableMessage ??
                        "Verified information unavailable."}
                    </p>
                  </div>
                );
              }
              return (
                <div key={section.key} className="space-y-2">
                  <h3 className="font-medium">{title}</h3>
                  <ul className="list-disc space-y-2 pl-5">
                    {section.items.map((item, i) => (
                      <li key={`${section.key}-${i}`}>
                        <span>{item.text}</span>
                        <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                          cites: {item.citationIds.join(", ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground">
              Resume Intelligence v{draft.resumeIntelligenceVersion}
              {view?.draftId ? ` · draft ${view.draftId.slice(0, 8)}…` : ""}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {drafts.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Previous drafts</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {drafts.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-2"
                >
                  <span className="text-muted-foreground">
                    {new Date(d.createdAt).toLocaleString()} · v
                    {d.resumeIntelligenceVersion}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => void loadDraft(d.id)}
                  >
                    Open
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
