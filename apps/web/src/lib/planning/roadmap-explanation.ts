/**
 * Pure Roadmap Explainability builder (Sprint 18 / M18).
 *
 * Pipeline: Roadmap → Path Facts + Step Facts → Roadmap Explanation.
 * No I/O. Does not call computeRoadmap or compareByFactors. Does not traverse
 * the Skill Graph. Only reads fields already present on the Roadmap artifact
 * (ADR-0015).
 */
import {
  ROADMAP_EXPLANATION_VERSION,
  type PathFacts,
  type RoadmapExplanation,
  type RoadmapExplanationFacts,
  type StepBlockedByFact,
  type StepFacts,
} from "@/lib/planning/roadmap-explainability-types";
import type { Roadmap, RoadmapStep } from "@/lib/planning/roadmap-types";

/**
 * Extracts Path Facts + Step Facts from a computed Roadmap.
 * Only current and next-upcoming steps are included as Step Facts.
 */
export function roadmapExplanationFactsFromRoadmap(
  roadmap: Roadmap,
): RoadmapExplanationFacts {
  const completed = roadmap.steps.filter((s) => s.kind === "completed");
  const current = roadmap.steps.find((s) => s.kind === "current") ?? null;
  const upcoming = roadmap.steps.filter((s) => s.kind === "upcoming");
  const nextUpcoming = upcoming[0] ?? null;

  const path: PathFacts = {
    planningEngineVersion: roadmap.planningEngineVersion,
    goalTitle: roadmap.goalTitle,
    completedCount: completed.length,
    currentStepId: current?.stepId ?? roadmap.currentStepId,
    currentName: current?.name ?? null,
    upcomingCount: upcoming.length,
    remainingHoursMin: roadmap.remainingHoursMin,
    remainingHoursMax: roadmap.remainingHoursMax,
    nextUpcomingStepId: nextUpcoming?.stepId ?? null,
    nextUpcomingName: nextUpcoming?.name ?? null,
  };

  return {
    path,
    current: current ? toStepFacts(current) : null,
    nextUpcoming: nextUpcoming ? toStepFacts(nextUpcoming) : null,
  };
}

/**
 * Builds declarative Roadmap Explanation from facts already on the Roadmap.
 * Does not infer planning rationale beyond those fields.
 */
export function buildRoadmapExplanation(
  facts: RoadmapExplanationFacts,
): RoadmapExplanation {
  return {
    roadmapExplanationVersion: ROADMAP_EXPLANATION_VERSION,
    planningEngineVersion: facts.path.planningEngineVersion,
    pathStructure: pathStructure(facts.path),
    whyCurrent: whyCurrent(facts),
    currentVsNext: currentVsNext(facts),
    blockingConstraints: blockingConstraints(facts),
    effortPresentation: effortPresentation(facts.path),
    goalAlignment: goalAlignment(facts.path),
  };
}

/** Full projection: computed Roadmap → explanation. */
export function explainRoadmap(roadmap: Roadmap): RoadmapExplanation {
  return buildRoadmapExplanation(roadmapExplanationFactsFromRoadmap(roadmap));
}

function toStepFacts(step: RoadmapStep): StepFacts {
  return {
    stepId: step.stepId,
    name: step.name,
    kind: step.kind,
    status: step.status,
    ontologyCategory: step.ontologyCategory,
    whyHere: step.whyHere,
    blockedBy: step.blockedBy.map(
      (b): StepBlockedByFact => ({
        name: b.name,
        currentMastery: b.currentMastery,
        minimumMastery: b.minimumMastery,
      }),
    ),
    effortHoursMin: step.effort.hoursMin,
    effortHoursMax: step.effort.hoursMax,
  };
}

function pathStructure(path: PathFacts): string {
  return `This Roadmap lists ${path.completedCount} mastered skill(s) for context, then the current skill, then ${path.upcomingCount} upcoming skill(s). Ordering and dependency gating are produced by Planning Engine v${path.planningEngineVersion}; this explanation only observes that output. Skills not on this path are not explained.`;
}

function whyCurrent(facts: RoadmapExplanationFacts): string {
  if (!facts.current) {
    return "No current step is present on this Roadmap (the forward path is empty — typically every included skill is already mastered).";
  }
  return `Current step: ${facts.current.name} (status ${facts.current.status}, ontology category ${facts.current.ontologyCategory}). Planner-provided placement note: ${facts.current.whyHere}`;
}

function currentVsNext(facts: RoadmapExplanationFacts): string {
  if (!facts.current) {
    return "No current vs next comparison — there is no current step.";
  }
  if (!facts.nextUpcoming) {
    return `No upcoming step follows ${facts.current.name} on this Roadmap.`;
  }

  const next = facts.nextUpcoming;
  const blockClause =
    next.blockedBy.length > 0
      ? ` Next step reports unmet hard prerequisites in the user's current state: ${formatBlockedBy(next.blockedBy)}.`
      : " Next step reports no unmet hard prerequisites in the user's current state (blockedBy is empty).";

  return `Immediate next upcoming step: ${next.name} (status ${next.status}, ontology category ${next.ontologyCategory}). Planner-provided placement note: ${next.whyHere}.${blockClause}`;
}

function blockingConstraints(facts: RoadmapExplanationFacts): string {
  const steps = [facts.current, facts.nextUpcoming].filter(
    (s): s is StepFacts => s !== null,
  );
  const withBlocks = steps.filter((s) => s.blockedBy.length > 0);
  if (withBlocks.length === 0) {
    return "On the current and next-upcoming steps, blockedBy is empty — no unmet hard-prerequisite thresholds are listed for those steps in this Roadmap.";
  }
  return withBlocks
    .map(
      (s) =>
        `${s.name} is listed with blockedBy: ${formatBlockedBy(s.blockedBy)} (current mastery vs required minimum on hard prerequisites).`,
    )
    .join(" ");
}

function effortPresentation(path: PathFacts): string {
  return `Remaining effort shown on this Roadmap is ${path.remainingHoursMin}–${path.remainingHoursMax} hours across current and upcoming steps. Effort figures are presentation only — they do not determine ordering.`;
}

function goalAlignment(path: PathFacts): string {
  if (!path.goalTitle) {
    return "This Roadmap has no goal title attached.";
  }
  return `Goal title on this Roadmap: "${path.goalTitle}".`;
}

function formatBlockedBy(blocks: StepBlockedByFact[]): string {
  return blocks
    .map(
      (b) =>
        `${b.name} (${b.currentMastery.toFixed(2)}/${b.minimumMastery.toFixed(2)})`,
    )
    .join(", ");
}
