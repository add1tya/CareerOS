"use client";

/**
 * Portfolio Intelligence UI (ADR-0028).
 * Answers: "What proof-oriented portfolio can CareerOS honestly support?"
 */

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PORTFOLIO_SECTION_KEYS,
  type PortfolioView,
} from "@/lib/portfolio-intelligence/portfolio-intelligence-types";

type DraftListItem = {
  id: string;
  createdAt: string;
  generatedAt: string;
  portfolioIntelligenceVersion: number;
  evidenceCount: number;
  goalTitle: string | null;
};

const SECTION_LABELS: Record<string, string> = {
  about: "About",
  featuredProjects: "Featured projects",
  skills: "Skills",
  technologies: "Technologies",
  learningJourney: "Learning journey",
  currentFocus: "Current focus",
  certifications: "Certifications",
  achievements: "Achievements",
  contactPlaceholders: "Contact",
  portfolioMetadata: "Metadata",
};

export function PortfolioIntelligencePanel({
  initialPreview,
  initialDrafts,
}: {
  initialPreview: PortfolioView;
  initialDrafts: DraftListItem[];
}) {
  const [preview, setPreview] = useState(initialPreview);
  const [drafts, setDrafts] = useState(initialDrafts);
  const [view, setView] = useState<PortfolioView | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function compose() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/portfolio/compose", {
        method: "POST",
        cache: "no-store",
      });
      const body = (await res.json()) as PortfolioView & {
        error?: string;
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
            generatedAt:
              body.draft?.metadata.generatedAt ?? body.createdAt!,
            portfolioIntelligenceVersion:
              body.draft?.metadata.portfolioIntelligenceVersion ?? 1,
            evidenceCount: body.draft?.metadata.evidenceCount ?? 0,
            goalTitle: body.draft?.metadata.goal.title ?? null,
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
      const res = await fetch(`/api/portfolio/drafts/${id}`, {
        cache: "no-store",
      });
      const body = (await res.json()) as PortfolioView & { error?: string };
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

  function download(format: "md" | "html") {
    const id = view?.draftId;
    if (!id) return;
    window.location.href = `/api/portfolio/drafts/${id}?format=${format}`;
  }

  const facts = view?.facts ?? preview.facts;
  const sections = view?.sections ?? preview.sections;
  const draft = view?.status === "ready" ? view.draft : null;

  const orderedSections = draft
    ? PORTFOLIO_SECTION_KEYS.map((key) =>
        draft.sections.find((s) => s.key === key),
      ).filter((s): s is NonNullable<typeof s> => Boolean(s))
    : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Portfolio Facts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Proof-oriented atoms from CareerOS. Featured project order and
            learning journey chronology are fixed here — the model only rewrites
            presentation. Distinct from Resume Intelligence.
          </p>
          {!facts?.sufficient ? (
            <p className="text-amber-700 dark:text-amber-400">
              {facts?.insufficientReason ??
                preview.insufficientReason ??
                "Insufficient facts."}
            </p>
          ) : null}
          {facts ? (
            <p className="text-xs text-muted-foreground">
              Evidence count: {facts.evidenceCount} · Featured projects:{" "}
              {facts.featuredProjectIds.length} · Timeline events:{" "}
              {facts.learningJourneyIds.length}
            </p>
          ) : null}
          {facts?.atoms?.length ? (
            <ul className="max-h-64 space-y-1 overflow-y-auto font-mono text-xs">
              {facts.atoms.map((atom) => (
                <li key={atom.id}>
                  <span className="text-muted-foreground">
                    [{atom.kind}] {atom.id}
                  </span>
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
                {PORTFOLIO_SECTION_KEYS.map((key) => {
                  const s = sections.sections.find((x) => x.key === key);
                  if (!s) return null;
                  return (
                    <li key={key}>
                      {SECTION_LABELS[key] ?? key}: {s.status}
                      {s.unavailableMessage ? ` — ${s.unavailableMessage}` : ""}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
          <Button
            type="button"
            onClick={() => void compose()}
            disabled={pending || !facts?.sufficient}
          >
            {pending ? "Composing…" : "Generate portfolio"}
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
            <dl className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
              <div>
                Generated:{" "}
                {new Date(draft.metadata.generatedAt).toLocaleString()}
              </div>
              <div>Goal: {draft.metadata.goal.title ?? "—"}</div>
              <div>
                Portfolio Intelligence v
                {draft.metadata.portfolioIntelligenceVersion}
              </div>
              <div>Evidence count: {draft.metadata.evidenceCount}</div>
              <div className="font-mono sm:col-span-2">
                Facts hash: {draft.metadata.factsHash.slice(0, 16)}…
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => download("md")}
              >
                Export Markdown
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => download("html")}
              >
                Export HTML
              </Button>
            </div>
            {orderedSections.map((section) => {
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
                      <li key={`${section.key}-${item.stableId ?? i}`}>
                        <span>{item.text}</span>
                        {item.stableId ? (
                          <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                            id: {item.stableId}
                          </span>
                        ) : null}
                        <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                          cites: {item.citationIds.join(", ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
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
                    {new Date(d.generatedAt).toLocaleString()}
                    {d.goalTitle ? ` · ${d.goalTitle}` : ""} · v
                    {d.portfolioIntelligenceVersion} · {d.evidenceCount}{" "}
                    evidence
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
