/**
 * Roadmap view (Sprint 9 / M9) — read-only, computed navigation.
 *
 * Renders the computed Roadmap: completed skills (context), the current skill
 * (equals the Decision Engine recommendation), and upcoming skills in projected
 * order. Effort/ETA are shown as guidance only and never drive ordering.
 */
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Roadmap, RoadmapStep } from "@/lib/planning/roadmap-types";

function StatusBadge({ step }: { step: RoadmapStep }) {
  const label =
    step.kind === "current"
      ? "Current"
      : step.kind === "completed"
        ? "Mastered"
        : step.status === "locked"
          ? "Locked"
          : "Upcoming";
  const tone =
    step.kind === "current"
      ? "bg-primary/10 text-primary ring-primary/20"
      : step.kind === "completed"
        ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20"
        : step.status === "locked"
          ? "bg-muted text-muted-foreground ring-foreground/10"
          : "bg-amber-500/10 text-amber-600 ring-amber-500/20";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${tone}`}
    >
      {label}
    </span>
  );
}

function EffortLabel({ step }: { step: RoadmapStep }) {
  if (step.kind === "completed") return null;
  return (
    <span className="text-xs text-muted-foreground">
      {step.effort.hoursMin}–{step.effort.hoursMax}h · cumulative{" "}
      {step.effort.cumulativeHoursMin}–{step.effort.cumulativeHoursMax}h
    </span>
  );
}

function StepRow({ step }: { step: RoadmapStep }) {
  const isCurrent = step.kind === "current";
  return (
    <li
      className={`rounded-lg border p-3 ${
        isCurrent ? "border-primary/40 bg-primary/5" : "bg-card"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs tabular-nums text-muted-foreground">
            {step.order + 1}.
          </span>
          <span className="text-sm font-medium">{step.name}</span>
          <span className="text-[11px] uppercase text-muted-foreground">
            {step.ontologyCategory}
          </span>
          <StatusBadge step={step} />
        </div>
        <EffortLabel step={step} />
      </div>

      <p className="mt-1.5 text-xs text-muted-foreground">{step.whyHere}</p>

      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
        <span>Mastery {step.mastery.toFixed(2)}</span>
        <span>Confidence {step.confidence.toFixed(2)}</span>
      </div>

      {step.blockedBy.length > 0 ? (
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Blocked by:{" "}
          {step.blockedBy
            .map(
              (b) =>
                `${b.name} (${b.currentMastery.toFixed(2)}/${b.minimumMastery.toFixed(
                  2,
                )})`,
            )
            .join(", ")}
        </p>
      ) : null}
    </li>
  );
}

export function RoadmapView({
  roadmap,
  weeklyHours,
}: {
  roadmap: Roadmap;
  weeklyHours?: number | null;
}) {
  const completed = roadmap.steps.filter((s) => s.kind === "completed");
  const path = roadmap.steps.filter((s) => s.kind !== "completed");

  const weeksMin =
    weeklyHours && weeklyHours > 0
      ? Math.ceil(roadmap.remainingHoursMin / weeklyHours)
      : null;
  const weeksMax =
    weeklyHours && weeklyHours > 0
      ? Math.ceil(roadmap.remainingHoursMax / weeklyHours)
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Roadmap</h1>
        <p className="text-sm text-muted-foreground">
          The computed route from where you are to{" "}
          {roadmap.goalTitle ? (
            <span className="font-medium">{roadmap.goalTitle}</span>
          ) : (
            "your goal"
          )}
          . It is recomputed from your Skill Graph every time you open this page —
          never stored — so it always reflects your latest progress. The first
          step is your current recommendation; only that skill is turned into an
          active Mission on the{" "}
          <Link href="/dashboard" className="underline">
            dashboard
          </Link>
          .
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Path to your goal</CardTitle>
        </CardHeader>
        <CardContent>
          {path.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Every skill on the map is mastered — no further steps to sequence.
            </p>
          ) : (
            <>
              <p className="mb-3 text-xs text-muted-foreground">
                {path.length} step{path.length === 1 ? "" : "s"} remaining ·{" "}
                {roadmap.remainingHoursMin}–{roadmap.remainingHoursMax}h total
                {weeksMin && weeksMax
                  ? ` · ~${weeksMin}–${weeksMax} weeks at ${weeklyHours}h/week`
                  : ""}
              </p>
              <ol className="space-y-2">
                {path.map((step) => (
                  <StepRow key={step.stepId} step={step} />
                ))}
              </ol>
            </>
          )}
        </CardContent>
      </Card>

      {completed.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Already mastered ({completed.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-wrap gap-2">
              {completed.map((step) => (
                <li
                  key={step.stepId}
                  className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-600 ring-1 ring-emerald-500/20"
                >
                  {step.name}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
