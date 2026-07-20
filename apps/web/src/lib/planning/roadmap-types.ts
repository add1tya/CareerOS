/**
 * Planning Engine / Roadmap v1 types (Sprint 9 / M9).
 *
 * The Roadmap is the "route" half of CareerOS's routing-engine model: the
 * current, computed sequence of skills from the user's present Skill Graph
 * state toward their Goal. It is COMPUTED, NEVER PERSISTED (AR-01,
 * career-graph-schema.md §3.9 / §4) — every field here describes an in-memory
 * projection derived purely from stored facts.
 *
 * Design constraints honored by this model:
 *   - Stable identity: a step is referenced by `stepId` (derived from the
 *     skill), never by array position — future-proofs UI state.
 *   - Ordering ≠ presentation: `effort` is presentation only and MUST NOT
 *     influence sequencing (which is decided solely by dependency constraints +
 *     the Decision Engine comparator).
 *   - Extensible: the whole computed path lives on `Roadmap.steps`; future
 *     near-term / long-term SLICES are derived from this same result, so no new
 *     computation or schema is needed to add them later.
 */
import type { OntologyCategory, SkillStatus } from "@/lib/skill-graph/types";

/**
 * Version of the deterministic sequencing algorithm. Bumped when the ordering
 * rules change, so a computed Roadmap remains explainable/reproducible even
 * though it is never stored (mirrors the versioning of the mastery policy and
 * reflection engine in earlier sprints).
 */
export const PLANNING_ENGINE_VERSION = 1;

/**
 * Where a skill sits relative to "now":
 *   - `completed`  — already mastered; shown first, for context.
 *   - `current`    — the single next skill; equals the Decision Engine winner.
 *   - `upcoming`   — everything after the current skill, in projected order.
 */
export type RoadmapStepKind = "completed" | "current" | "upcoming";

/** One unmet HARD prerequisite, in the user's CURRENT real state. */
export type BlockedBy = {
  skillKey: string;
  name: string;
  /** Threshold the prerequisite must reach (skill_dependencies.minimum_mastery). */
  minimumMastery: number;
  /** The prerequisite's mastery right now. */
  currentMastery: number;
};

/**
 * Effort annotation — PRESENTATION ONLY. Never an input to ordering.
 * `cumulative*` is the running total of remaining effort (current + upcoming) up
 * to and including this step; completed steps contribute 0 (already done).
 */
export type RoadmapStepEffort = {
  hoursMin: number;
  hoursMax: number;
  cumulativeHoursMin: number;
  cumulativeHoursMax: number;
};

export type RoadmapStep = {
  /** Stable identity derived from the underlying skill (never array position). */
  stepId: string;
  skillKey: string;
  name: string;
  ontologyCategory: OntologyCategory;
  kind: RoadmapStepKind;
  status: SkillStatus;
  mastery: number;
  confidence: number;
  /** 0-based position in the full computed path. Presentation only. */
  order: number;
  /** Deterministic rationale for this step's placement. */
  whyHere: string;
  /**
   * HARD prerequisites not yet satisfied in the user's current state. Empty for
   * completed / current / already-available skills. Improves explainability
   * without affecting ordering.
   */
  blockedBy: BlockedBy[];
  effort: RoadmapStepEffort;
};

export type Roadmap = {
  planningEngineVersion: number;
  goalTitle: string | null;
  /**
   * The full computed path in order: completed skills first, then the current
   * skill, then upcoming skills. Slices (near-term / long-term) are derived from
   * this list; slicing itself is deferred.
   */
  steps: RoadmapStep[];
  /** Stable id of the `current` step, if any (all-mastered graphs have none). */
  currentStepId: string | null;
  /** Remaining effort across current + upcoming steps. Presentation only. */
  remainingHoursMin: number;
  remainingHoursMax: number;
};
