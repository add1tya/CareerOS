/**
 * Roadmap Explainability types + policy v1 (Sprint 18 / M18).
 *
 * Explainability is a READ MODEL / projection over the already-computed Roadmap
 * (ADR-0015). It must never regenerate the Roadmap, reorder steps, traverse the
 * Skill Graph independently, or influence Planning.
 *
 * Pipeline:
 *   Roadmap
 *     → Path Facts + Step Facts
 *       → Roadmap Explanation
 *         → UI
 *
 * ROADMAP_EXPLANATION_VERSION is independent of PLANNING_ENGINE_VERSION.
 */
import type { RoadmapStepKind } from "@/lib/planning/roadmap-types";

/** Bump when explanation structure or declarative copy rules change. */
export const ROADMAP_EXPLANATION_VERSION = 1;

// ---------------------------------------------------------------------------
// Path Facts (route-level — from Roadmap aggregate fields)
// ---------------------------------------------------------------------------

export type PathFacts = {
  planningEngineVersion: number;
  goalTitle: string | null;
  completedCount: number;
  currentStepId: string | null;
  currentName: string | null;
  upcomingCount: number;
  remainingHoursMin: number;
  remainingHoursMax: number;
  /** First upcoming after current, if any (comparison limit). */
  nextUpcomingStepId: string | null;
  nextUpcomingName: string | null;
};

// ---------------------------------------------------------------------------
// Step Facts (only current + next upcoming — not the full path essay)
// ---------------------------------------------------------------------------

export type StepBlockedByFact = {
  name: string;
  currentMastery: number;
  minimumMastery: number;
};

export type StepFacts = {
  stepId: string;
  name: string;
  kind: RoadmapStepKind;
  status: string;
  ontologyCategory: string;
  whyHere: string;
  blockedBy: StepBlockedByFact[];
  effortHoursMin: number;
  effortHoursMax: number;
};

/**
 * Modular fact bundle. Path facts describe structure; step facts describe the
 * current stage and (optionally) the immediate next upcoming step only.
 */
export type RoadmapExplanationFacts = {
  path: PathFacts;
  current: StepFacts | null;
  nextUpcoming: StepFacts | null;
};

// ---------------------------------------------------------------------------
// Roadmap Explanation (declarative answers — UI renders these)
// ---------------------------------------------------------------------------

export type RoadmapExplanation = {
  roadmapExplanationVersion: number;
  planningEngineVersion: number;
  /** Completed → current → upcoming structure. */
  pathStructure: string;
  /** Why the current step is current (from step facts only). */
  whyCurrent: string;
  /** Current vs next upcoming only — prerequisites / blockedBy / kind. */
  currentVsNext: string;
  /** What blockedBy means on this roadmap (constraints, not optimizations). */
  blockingConstraints: string;
  /** Effort is presentation-only. */
  effortPresentation: string;
  /** Goal title as recorded on the Roadmap. */
  goalAlignment: string;
};
