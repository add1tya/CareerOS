/**
 * Recommendation explainability (Sprint 17 / M17) — founder-facing surface.
 *
 * Renders a Decision Explanation produced by the pure projection pipeline.
 * Does not compute ranking. DecisionInspector remains the engineering surface.
 */
import type { DecisionExplanation } from "@/lib/decision-engine/explainability-types";

const SECTIONS: {
  key: keyof Pick<
    DecisionExplanation,
    | "whyThisSkill"
    | "whyNow"
    | "whyNotOther"
    | "ifSkipped"
    | "goalAlignment"
  >;
  title: string;
}[] = [
  { key: "whyThisSkill", title: "Why this skill" },
  { key: "whyNow", title: "Why now" },
  { key: "whyNotOther", title: "Why not the runner-up" },
  { key: "ifSkipped", title: "If skipped or overridden" },
  { key: "goalAlignment", title: "How it relates to the goal" },
];

export function RecommendationExplanation({
  explanation,
}: {
  explanation: DecisionExplanation | null;
}) {
  if (!explanation) {
    return (
      <p className="text-xs text-muted-foreground">
        No structured explanation is available for this recommendation snapshot.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <div>
        <p className="text-sm font-medium">Why this recommendation</p>
        <p className="text-xs text-muted-foreground">
          Structured facts from the decision snapshot at record time — not a new
          ranking pass. Explanation policy v
          {explanation.decisionExplanationVersion}.
        </p>
      </div>

      <dl className="space-y-3 text-sm">
        {SECTIONS.map(({ key, title }) => (
          <div key={key}>
            <dt className="font-medium">{title}</dt>
            <dd className="mt-1 text-muted-foreground">{explanation[key]}</dd>
          </div>
        ))}
      </dl>

      {explanation.decidingFactorId ? (
        <p className="text-xs text-muted-foreground">
          Deciding factor in snapshot: {explanation.decidingFactorId}
          {explanation.runnerUpName
            ? ` · runner-up: ${explanation.runnerUpName}`
            : ""}
        </p>
      ) : null}
    </div>
  );
}
