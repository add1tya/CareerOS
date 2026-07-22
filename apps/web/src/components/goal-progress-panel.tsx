/**
 * Goal progress panel (Sprint 19 / M19) — founder-facing roadmap-stage surface.
 *
 * Renders Goal Progress Explanation. Does not compute Progress Score or rank
 * contributions (ADR-0016).
 */
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GoalProgressExplanation } from "@/lib/progress/goal-progress-explainability-types";

const SECTIONS: {
  key: keyof Pick<
    GoalProgressExplanation,
    | "currentStage"
    | "completedOnPath"
    | "currentOnPath"
    | "remainingOnPath"
    | "hoursContext"
    | "measurementLimits"
  >;
  title: string;
}[] = [
  { key: "currentStage", title: "Current stage" },
  { key: "completedOnPath", title: "Completed on this roadmap" },
  { key: "currentOnPath", title: "Current on this roadmap" },
  { key: "remainingOnPath", title: "Remaining on this roadmap" },
  { key: "hoursContext", title: "Hours (context only)" },
  { key: "measurementLimits", title: "What this does not measure" },
];

export function GoalProgressPanel({
  explanation,
}: {
  explanation: GoalProgressExplanation;
}) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Goal progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          Roadmap-stage explanation toward your active goal — not a weighted
          Progress Score. Explanation policy v
          {explanation.goalProgressExplanationVersion} · Planning Engine v
          {explanation.planningEngineVersion}.
        </p>

        <dl className="space-y-3">
          {SECTIONS.map(({ key, title }) => (
            <div key={key}>
              <dt className="font-medium">{title}</dt>
              <dd className="mt-1 text-muted-foreground">{explanation[key]}</dd>
            </div>
          ))}
        </dl>

        <p className="text-sm">
          <Link href="/roadmap" className="underline underline-offset-2">
            View full roadmap
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
