/**
 * Roadmap explainability panel (Sprint 18 / M18) — founder-facing path-level surface.
 *
 * Renders a Roadmap Explanation from the pure projection. Does not recompute
 * or reorder the Roadmap. Per-step whyHere stays on each step row (ADR-0015).
 */
import type { RoadmapExplanation } from "@/lib/planning/roadmap-explainability-types";

const SECTIONS: {
  key: keyof Pick<
    RoadmapExplanation,
    | "pathStructure"
    | "whyCurrent"
    | "currentVsNext"
    | "blockingConstraints"
    | "effortPresentation"
    | "goalAlignment"
  >;
  title: string;
}[] = [
  { key: "pathStructure", title: "Path structure" },
  { key: "whyCurrent", title: "Why this is current" },
  { key: "currentVsNext", title: "Current vs next" },
  { key: "blockingConstraints", title: "Prerequisite constraints" },
  { key: "effortPresentation", title: "Effort (presentation only)" },
  { key: "goalAlignment", title: "Goal on this roadmap" },
];

export function RoadmapExplanationPanel({
  explanation,
}: {
  explanation: RoadmapExplanation;
}) {
  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
      <div>
        <p className="text-sm font-medium">Why this roadmap order</p>
        <p className="text-xs text-muted-foreground">
          Structured facts from the computed Roadmap artifact — not a new planning
          pass. Explanation policy v{explanation.roadmapExplanationVersion} ·
          Planning Engine v{explanation.planningEngineVersion}.
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
    </div>
  );
}
