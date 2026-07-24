"use client";

/**
 * Career Gap Analysis UI (ADR-0025).
 * Answers: "Where am I strong, missing evidence, or weak — right now?"
 *
 * Renderer owns section order via GAP_SECTION_KEYS.
 */

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  GAP_SECTION_KEYS,
  type GapView,
} from "@/lib/gap-analysis/gap-analysis-types";

type ReportListItem = {
  id: string;
  createdAt: string;
  generatedAt: string;
  gapAnalysisVersion: number;
  goalTitle: string | null;
};

const SECTION_LABELS: Record<string, string> = {
  overview: "Overview",
  strengths: "Strengths",
  missing: "Missing (no verified evidence)",
  weaknesses: "Weak (evidence present, low mastery)",
  roadmapGaps: "Roadmap gaps",
  confidenceGaps: "Confidence gaps",
  measurementLimits: "Measurement limits",
};

export function GapAnalysisPanel({
  initialPreview,
  initialReports,
}: {
  initialPreview: GapView;
  initialReports: ReportListItem[];
}) {
  const [preview, setPreview] = useState(initialPreview);
  const [reports, setReports] = useState(initialReports);
  const [view, setView] = useState<GapView | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/gap-analysis", {
        method: "POST",
        cache: "no-store",
      });
      const body = (await res.json()) as GapView & {
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        setError(body.error ?? `Analysis failed (${res.status}).`);
        return;
      }
      setView(body);
      if (body.status === "ready" && body.reportId && body.createdAt) {
        setReports((prev) => [
          {
            id: body.reportId!,
            createdAt: body.createdAt!,
            generatedAt:
              body.report?.metadata.generatedAt ?? body.createdAt!,
            gapAnalysisVersion:
              body.report?.metadata.gapAnalysisVersion ?? 1,
            goalTitle: body.report?.metadata.goal.title ?? null,
          },
          ...prev.filter((r) => r.id !== body.reportId),
        ]);
      }
      if (body.facts) {
        setPreview({
          ...body,
          report: null,
          reportId: null,
          createdAt: null,
          status: body.facts.sufficient ? "missing" : "insufficient",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setPending(false);
    }
  }

  async function loadReport(id: string) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/gap-analysis/reports/${id}`, {
        cache: "no-store",
      });
      const body = (await res.json()) as GapView & { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Failed to load report.");
        return;
      }
      setView(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report.");
    } finally {
      setPending(false);
    }
  }

  const facts = view?.facts ?? preview.facts;
  const sections = view?.sections ?? preview.sections;
  const report = view?.status === "ready" ? view.report : null;

  // Stable order — never AI array order.
  const orderedReportSections = report
    ? GAP_SECTION_KEYS.map((key) =>
        report.sections.find((s) => s.key === key),
      ).filter((s): s is NonNullable<typeof s> => Boolean(s))
    : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gap Facts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Deterministic atoms from your Career Graph. Missing (no Evidence)
            and Weak (Evidence present, low mastery) stay separate. Analysis
            never plans or predicts.
          </p>
          {!facts?.sufficient ? (
            <p className="text-amber-700 dark:text-amber-400">
              {facts?.insufficientReason ??
                preview.insufficientReason ??
                "Insufficient facts for analysis."}
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
                {GAP_SECTION_KEYS.map((key) => {
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
            onClick={() => void generate()}
            disabled={pending || !facts?.sufficient}
          >
            {pending ? "Generating…" : "Generate gap analysis"}
          </Button>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {report ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <dl className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
              <div>
                Generated:{" "}
                {new Date(report.metadata.generatedAt).toLocaleString()}
              </div>
              <div>Goal: {report.metadata.goal.title ?? "—"}</div>
              <div>Gap Analysis v{report.metadata.gapAnalysisVersion}</div>
              <div>
                Prompt v{report.metadata.promptVersion} · Adapter v
                {report.metadata.adapterVersion}
              </div>
              <div className="font-mono sm:col-span-2">
                Facts hash: {report.metadata.factsHash.slice(0, 16)}…
              </div>
            </dl>
            {orderedReportSections.map((section) => {
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
                <div key={section.key} className="space-y-1">
                  <h3 className="font-medium">{title}</h3>
                  <p>{section.prose}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    cites: {section.citationIds.join(", ")}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      {reports.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Previous reports</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {reports.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2"
                >
                  <span className="text-muted-foreground">
                    {new Date(r.generatedAt).toLocaleString()}
                    {r.goalTitle ? ` · ${r.goalTitle}` : ""} · v
                    {r.gapAnalysisVersion}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => void loadReport(r.id)}
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
