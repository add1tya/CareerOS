/**
 * Pure Goal Progress Explainability builder (Sprint 19 / M19).
 *
 * Pipeline: Goal + Roadmap → Roadmap Progress Facts → Goal Progress Explanation.
 * No I/O. Does not call computeRoadmap, compareByFactors, or mastery policy.
 * Does not invent Progress Score or contribution rankings (ADR-0016).
 */
import {
  GOAL_PROGRESS_EXPLANATION_VERSION,
  type GoalProgressExplanation,
  type GoalProgressSkillFact,
  type RoadmapProgressFacts,
  type RoadmapStage,
} from "@/lib/progress/goal-progress-explainability-types";
import type { Roadmap, RoadmapStep } from "@/lib/planning/roadmap-types";

export type GoalProgressInput = {
  goalTitle: string | null;
  goalDeadline: string | null;
  goalStatus: string | null;
  roadmap: Roadmap;
};

/**
 * Extracts Roadmap Progress Facts from Goal + computed Roadmap.
 * Completed / current / remaining only — no contribution ordering.
 */
export function roadmapProgressFactsFrom(
  input: GoalProgressInput,
): RoadmapProgressFacts {
  const { roadmap } = input;
  const completedSteps = roadmap.steps.filter((s) => s.kind === "completed");
  const currentStep = roadmap.steps.find((s) => s.kind === "current") ?? null;
  const upcomingSteps = roadmap.steps.filter((s) => s.kind === "upcoming");
  // Remaining = work still ahead on the path (current + upcoming).
  const remainingSteps = [
    ...(currentStep ? [currentStep] : []),
    ...upcomingSteps,
  ];

  return {
    goalTitle: input.goalTitle,
    goalDeadline: input.goalDeadline,
    goalStatus: input.goalStatus,
    planningEngineVersion: roadmap.planningEngineVersion,
    stage: deriveStage(completedSteps.length, currentStep, upcomingSteps.length),
    completed: completedSteps.map(toSkillFact),
    current: currentStep ? toSkillFact(currentStep) : null,
    remaining: remainingSteps.map(toSkillFact),
    remainingHoursMin: roadmap.remainingHoursMin,
    remainingHoursMax: roadmap.remainingHoursMax,
  };
}

export function buildGoalProgressExplanation(
  facts: RoadmapProgressFacts,
): GoalProgressExplanation {
  return {
    goalProgressExplanationVersion: GOAL_PROGRESS_EXPLANATION_VERSION,
    planningEngineVersion: facts.planningEngineVersion,
    currentStage: currentStageCopy(facts),
    completedOnPath: completedOnPathCopy(facts),
    currentOnPath: currentOnPathCopy(facts),
    remainingOnPath: remainingOnPathCopy(facts),
    hoursContext: hoursContextCopy(facts),
    measurementLimits: MEASUREMENT_LIMITS,
  };
}

/** Full projection: Goal + Roadmap → explanation. */
export function explainGoalProgress(
  input: GoalProgressInput,
): GoalProgressExplanation {
  return buildGoalProgressExplanation(roadmapProgressFactsFrom(input));
}

const MEASUREMENT_LIMITS =
  "This explanation reflects progress through the current roadmap and intentionally does not estimate overall goal readiness or weighted completion. Progress Score (Mastery × skill_goal_relevance) is deferred until goal-relevance weights exist.";

function toSkillFact(step: RoadmapStep): GoalProgressSkillFact {
  return {
    stepId: step.stepId,
    name: step.name,
    kind: step.kind,
    mastery: step.mastery,
    confidence: step.confidence,
    status: step.status,
  };
}

function deriveStage(
  completedCount: number,
  current: RoadmapStep | null,
  upcomingCount: number,
): RoadmapStage {
  if (!current && upcomingCount === 0 && completedCount === 0) {
    return "no_path";
  }
  if (!current && upcomingCount === 0 && completedCount > 0) {
    return "path_complete";
  }
  if (completedCount === 0 && current) {
    return "not_started";
  }
  return "in_progress";
}

function currentStageCopy(facts: RoadmapProgressFacts): string {
  const goal = facts.goalTitle
    ? `Active goal: "${facts.goalTitle}"${facts.goalStatus ? ` (status ${facts.goalStatus})` : ""}.`
    : "No active goal title is attached.";
  const deadline = facts.goalDeadline
    ? ` Goal deadline on record: ${facts.goalDeadline}.`
    : "";

  switch (facts.stage) {
    case "no_path":
      return `${goal}${deadline} Roadmap stage: no path skills are listed (empty computed roadmap). This is a roadmap stage, not a claim about overall goal completion.`;
    case "not_started":
      return `${goal}${deadline} Roadmap stage: not started on the path — no mastered skills on the roadmap yet; current skill is present. This is a roadmap stage, not overall goal completion.`;
    case "in_progress":
      return `${goal}${deadline} Roadmap stage: in progress — ${facts.completed.length} mastered on the path, with remaining work ahead. This is a roadmap stage, not overall goal completion.`;
    case "path_complete":
      return `${goal}${deadline} Roadmap stage: path complete — every skill on this computed roadmap is mastered. This does not assert overall goal readiness beyond the current roadmap.`;
  }
}

function completedOnPathCopy(facts: RoadmapProgressFacts): string {
  if (facts.completed.length === 0) {
    return "No completed (mastered) skills are listed on this roadmap.";
  }
  const list = facts.completed
    .map(
      (s) =>
        `${s.name} (mastery ${s.mastery.toFixed(2)}, confidence ${s.confidence.toFixed(2)})`,
    )
    .join("; ");
  return `Completed roadmap skills (${facts.completed.length}, unranked): ${list}.`;
}

function currentOnPathCopy(facts: RoadmapProgressFacts): string {
  if (!facts.current) {
    return "No current roadmap skill is listed.";
  }
  const s = facts.current;
  return `Current roadmap skill: ${s.name} (status ${s.status}; mastery ${s.mastery.toFixed(2)}, confidence ${s.confidence.toFixed(2)}).`;
}

function remainingOnPathCopy(facts: RoadmapProgressFacts): string {
  if (facts.remaining.length === 0) {
    return "No remaining skills are listed on this roadmap (current + upcoming).";
  }
  const list = facts.remaining
    .map((s) => `${s.name} (${s.kind})`)
    .join("; ");
  return `Remaining roadmap skills (${facts.remaining.length}, current then upcoming, unranked by goal weight): ${list}.`;
}

function hoursContextCopy(facts: RoadmapProgressFacts): string {
  return `Remaining effort on the roadmap (presentation only): ${facts.remainingHoursMin}–${facts.remainingHoursMax} hours. These hours are informational context and are not a percentage of goal completion.`;
}
