/**
 * Goal Explorer (Sprint 22 / M22) — founder-facing goal dossier.
 *
 * Inspection only. Current Roadmap sections are path context, not goal
 * requirements (ADR-0019). Distinct from Goal Progress Explainability (stage).
 */
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  GoalExplorerView,
  GoalPathSkillFact,
} from "@/lib/goal/goal-explorer-types";

function SkillList({
  title,
  skills,
}: {
  title: string;
  skills: GoalPathSkillFact[];
}) {
  return (
    <div>
      <p className="text-sm font-medium">{title}</p>
      {skills.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">None.</p>
      ) : (
        <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
          {skills.map((s) => (
            <li key={s.skillKey}>
              <span className="font-medium text-foreground">{s.name}</span>
              {" · "}
              {s.kind} · mastery {s.mastery.toFixed(2)} / confidence{" "}
              {s.confidence.toFixed(2)}
              <span className="block text-[11px]">{s.skillKey}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function GoalExplorerPanel({
  view,
}: {
  view: GoalExplorerView | null;
}) {
  if (!view) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Goal explorer</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No goal on record yet. Complete onboarding to create a root goal.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Goal explorer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          Read-only inspection of the active goal and recorded constraints.
          Path skill lists come from the{" "}
          <span className="font-medium text-foreground">Current Roadmap</span>
          {" "}
          (optional context) — not from a goal-requirements join. Explorer
          policy v{view.goalExplorerVersion}.
        </p>

        <div>
          <p className="font-medium">Goal identity</p>
          <p className="mt-1 text-muted-foreground">
            <span className="font-medium text-foreground">{view.title}</span>
            {" · "}
            status {view.status} · source {view.source}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            id:{view.goalId} · created {view.createdAt}
          </p>
          <p className="mt-1 text-muted-foreground">{view.metadataSection}</p>
        </div>

        <div>
          <p className="font-medium">Constraints &amp; assumptions on record</p>
          <p className="mt-1 text-muted-foreground">{view.constraintsSection}</p>
        </div>

        {view.hasRoadmapContext ? (
          <>
            <SkillList
              title="Current Roadmap — completed on path"
              skills={view.completedOnPath}
            />
            <div>
              <p className="font-medium">Current Roadmap — current on path</p>
              <p className="mt-1 text-muted-foreground">
                {view.currentRoadmapCurrentSection}
              </p>
            </div>
            <SkillList
              title="Current Roadmap — remaining on path"
              skills={view.remainingOnPath}
            />
            <div>
              <p className="font-medium">Current Roadmap — contribution context</p>
              <p className="mt-1 text-muted-foreground">
                {view.currentRoadmapContributionSection}
              </p>
            </div>
          </>
        ) : (
          <p className="text-muted-foreground">
            Current Roadmap context not loaded — goal and constraints still
            inspectable.
          </p>
        )}

        <div>
          <p className="font-medium">What this does not define</p>
          <p className="mt-1 text-muted-foreground">{view.measurementLimits}</p>
        </div>

        <p className="text-sm">
          <Link href="/roadmap" className="underline underline-offset-2">
            View Current Roadmap
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
