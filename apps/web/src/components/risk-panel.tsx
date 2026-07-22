/**
 * Risk panel (Sprint 14 / M14) — UI-only projection surface.
 *
 * Answers: "Is my plan at risk, and why?"
 * Shown only when any dimension is elevated or higher. Never mutates Decision,
 * suppression, mastery, or missions. No shame / streak language.
 */
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  DimensionAssessment,
  RiskAssessment,
  RiskLevel,
} from "@/lib/risk/risk-types";

const LEVEL_LABEL: Record<RiskLevel, string> = {
  low: "Low",
  moderate: "Moderate",
  elevated: "Elevated",
  high: "High",
};

export function RiskPanel({ assessment }: { assessment: RiskAssessment }) {
  if (!assessment.isElevated) {
    return null;
  }

  const elevated = [assessment.pace, assessment.scope, assessment.burnout].filter(
    (d) => d.level === "elevated" || d.level === "high",
  );

  return (
    <Card className="mb-6 border-orange-500/30 bg-orange-500/5">
      <CardHeader>
        <CardTitle className="text-lg">Risk assessment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          Deterministic projection from your goals, constraints, History, and
          Planning remaining effort — not a judgment of character. Rankings and
          missions are unchanged.
        </p>

        <ul className="space-y-3">
          {elevated.map((dim) => (
            <DimensionBlock key={dim.dimension} dim={dim} />
          ))}
        </ul>

        <p className="text-xs text-muted-foreground">
          Risk policy v{assessment.riskPolicyVersion} · assessed{" "}
          {new Date(assessment.assessedAt).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>

        <p className="text-sm">
          <Link href="/roadmap" className="underline underline-offset-2">
            Review roadmap effort
          </Link>
          {" · "}
          <Link href="/history" className="underline underline-offset-2">
            Review history
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

function DimensionBlock({ dim }: { dim: DimensionAssessment }) {
  return (
    <li className="rounded-lg border bg-card/80 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium capitalize">{dim.dimension} risk</span>
        <span className="text-xs text-muted-foreground">
          {LEVEL_LABEL[dim.level]} · confidence {dim.confidence}
        </span>
      </div>
      <p className="mt-1.5 text-muted-foreground">{dim.rationale}</p>
    </li>
  );
}
