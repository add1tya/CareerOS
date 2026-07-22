/**
 * Goal Explorer types + policy v1 (Sprint 22 / M22).
 *
 * Read-only projection over Goal + Constraints (ADR-0019). Never modifies goals,
 * planning, or recommendations. Never infers skill_goal_relevance requirements.
 *
 * Pipeline:
 *   Goal
 *     → Goal Facts
 *       → Goal Context
 *         → Goal Path Facts (optional Roadmap enrichment)
 *           → Goal Explorer View
 *             → UI
 *
 * GOAL_EXPLORER_VERSION is independent of Goal schema, Goal Progress
 * Explainability, and Planning versions.
 */
import type { RoadmapStepKind } from "@/lib/planning/roadmap-types";

/** Bump when explorer view structure or fact rules change. */
export const GOAL_EXPLORER_VERSION = 1;

// ---------------------------------------------------------------------------
// Goal Facts (identity + recorded goal metadata — provenance)
// ---------------------------------------------------------------------------

export type GoalFacts = {
  goalId: string;
  title: string;
  source: string;
  createdAt: string;
  status: string;
  deadline: string | null;
  updatedAt: string;
  parentGoalId: string | null;
};

// ---------------------------------------------------------------------------
// Goal Context (recorded constraints / assumptions — not planning)
// ---------------------------------------------------------------------------

export type GoalConstraintContext = {
  availableHoursPerWeek: number | null;
  lastConfirmedAt: string | null;
  constraintCreatedAt: string | null;
  constraintUpdatedAt: string | null;
};

export type GoalContext = {
  goal: GoalFacts;
  constraints: GoalConstraintContext;
};

// ---------------------------------------------------------------------------
// Goal Path Facts (Current Roadmap only — optional enrichment)
// ---------------------------------------------------------------------------

export type GoalPathSkillFact = {
  skillKey: string;
  name: string;
  kind: RoadmapStepKind;
  mastery: number;
  confidence: number;
  status: string;
};

export type GoalPathFacts = {
  planningEngineVersion: number;
  completedOnPath: GoalPathSkillFact[];
  currentOnPath: GoalPathSkillFact | null;
  remainingOnPath: GoalPathSkillFact[];
  remainingHoursMin: number;
  remainingHoursMax: number;
};

// ---------------------------------------------------------------------------
// Goal Explorer View
// ---------------------------------------------------------------------------

export type GoalExplorerView = {
  goalExplorerVersion: number;
  /** Provenance identity always present when a goal exists. */
  goalId: string;
  title: string;
  source: string;
  createdAt: string;
  status: string;
  metadataSection: string;
  constraintsSection: string;
  /** Labeled "Current Roadmap" — not goal definition. */
  currentRoadmapCompletedSection: string;
  currentRoadmapCurrentSection: string;
  currentRoadmapRemainingSection: string;
  currentRoadmapContributionSection: string;
  measurementLimits: string;
  /** Structured lists for UI (empty when roadmap omitted). */
  completedOnPath: GoalPathSkillFact[];
  currentOnPath: GoalPathSkillFact | null;
  remainingOnPath: GoalPathSkillFact[];
  hasRoadmapContext: boolean;
};
