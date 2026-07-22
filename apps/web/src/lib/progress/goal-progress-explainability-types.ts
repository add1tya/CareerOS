/**
 * Goal Progress Explainability types + policy v1 (Sprint 19 / M19).
 *
 * Projection over Goal + computed Roadmap (+ mastery already on steps).
 * Never computes Progress Score, never modifies planning/mastery/recommendations
 * (ADR-0016).
 *
 * Pipeline:
 *   Goal
 *     → Roadmap Progress Facts
 *       → Goal Progress Explanation
 *         → UI
 *
 * "Progress Facts" as a name is reserved for future weighted progress models.
 * GOAL_PROGRESS_EXPLANATION_VERSION is independent of Planning / Decision /
 * Roadmap Explainability versions.
 */
import type { RoadmapStepKind } from "@/lib/planning/roadmap-types";

/** Bump when explanation structure or declarative copy rules change. */
export const GOAL_PROGRESS_EXPLANATION_VERSION = 1;

/** Qualitative stage derived from Roadmap structure — not overall goal completion. */
export const ROADMAP_STAGES = [
  "no_path",
  "not_started",
  "in_progress",
  "path_complete",
] as const;
export type RoadmapStage = (typeof ROADMAP_STAGES)[number];

export type GoalProgressSkillFact = {
  stepId: string;
  name: string;
  kind: RoadmapStepKind;
  mastery: number;
  confidence: number;
  status: string;
};

/**
 * Facts extracted from Goal + Roadmap only. No weighted scores.
 * Reserved name "Progress Facts" is intentionally not used here.
 */
export type RoadmapProgressFacts = {
  goalTitle: string | null;
  goalDeadline: string | null;
  goalStatus: string | null;
  planningEngineVersion: number;
  stage: RoadmapStage;
  completed: GoalProgressSkillFact[];
  current: GoalProgressSkillFact | null;
  remaining: GoalProgressSkillFact[];
  remainingHoursMin: number;
  remainingHoursMax: number;
};

export type GoalProgressExplanation = {
  goalProgressExplanationVersion: number;
  planningEngineVersion: number;
  /** Qualitative roadmap stage — not overall goal readiness. */
  currentStage: string;
  /** Completed roadmap skills (unranked). */
  completedOnPath: string;
  /** Current roadmap skill, if any. */
  currentOnPath: string;
  /** Remaining roadmap skills (current + upcoming summarized without ranking). */
  remainingOnPath: string;
  /** Remaining hours as context only — not % completion. */
  hoursContext: string;
  /** Explicit measurement limits. */
  measurementLimits: string;
};
