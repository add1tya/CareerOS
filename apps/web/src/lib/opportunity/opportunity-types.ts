/**
 * Opportunity Assessment types + Opportunity Policy v1 (Sprint 16 / M16).
 *
 * Opportunity is a READ MODEL / projection over Constraints, History, and
 * Planning remaining effort (ADR-0013). Never stored as mutable state.
 *
 * Internal pipeline (cause composability):
 *   Constraint Change → Opportunity Cause → Opportunity Assessment
 *
 * Assessment informs UI only. It must never modify Decision ranking, Roadmap
 * generation, suppression, mastery, or missions.
 */
import type { HistoryEventType } from "@/lib/history/history-types";

/** Bump when thresholds, windows, formulas, or confidence rules change. */
export const OPPORTUNITY_POLICY_VERSION = 1;

/** V1 stub type — constraint-change unlock only (§7 / EX-09). */
export const OPPORTUNITY_CAUSE_KINDS = ["constraint_change_unlock"] as const;
export type OpportunityCauseKind = (typeof OPPORTUNITY_CAUSE_KINDS)[number];

export const OPPORTUNITY_CONFIDENCE = ["low", "medium", "high"] as const;
export type OpportunityConfidence = (typeof OPPORTUNITY_CONFIDENCE)[number];

// ---------------------------------------------------------------------------
// Opportunity Policy v1 — configuration (not buried in assessor logic)
// ---------------------------------------------------------------------------

/**
 * How long after a qualifying constraint increase the opportunity stays
 * active. Derived solely as assessment_time - event_time (no persisted
 * surfaced/dismissed flags).
 */
export const OPPORTUNITY_ACTIVE_WINDOW_DAYS = 14;

/** Minimum hours/week increase to count as a qualifying Constraint Change. */
export const MIN_HOURS_INCREASE = 2;

/**
 * Extra capacity from the increase (hoursDelta × weeksRemaining) must be at
 * least this fraction of Planning remaining mid-hours to be material.
 */
export const MIN_UNLOCK_FRACTION_OF_REMAINING = 0.1;

/**
 * When goal deadline is missing, use this horizon (weeks) for capacity math.
 * Confidence is lowered when the default is used.
 */
export const DEFAULT_HORIZON_WEEKS = 12;

/** History event that carries Constraint Change facts. */
export const CONSTRAINT_CHANGE_EVENT: HistoryEventType = "constraint_updated";

// ---------------------------------------------------------------------------
// Pipeline shapes: Change → Cause → Assessment
// ---------------------------------------------------------------------------

/** Domain fact: hours available per week changed (from History payload). */
export type ConstraintChange = {
  previousHours: number;
  newHours: number;
  occurredAt: string;
};

/**
 * Interpreted cause. Future opportunity sources add new kinds without changing
 * Assessment assembly.
 */
export type OpportunityCause = {
  kind: OpportunityCauseKind;
  constraintChange: ConstraintChange;
  hoursDelta: number;
  /** Days between cause event and assessment time. */
  ageDays: number;
};

export type OpportunityFactor = {
  key: string;
  value: string | number | boolean | null;
};

/**
 * UI-facing assessment. Messaging fields answer: what changed, why it matters,
 * what is now possible — not what to do next (no recommendation wording).
 */
export type OpportunityAssessment = {
  opportunityPolicyVersion: number;
  /** True when a cause is active inside the policy window and material. */
  isActive: boolean;
  cause: OpportunityCause | null;
  confidence: OpportunityConfidence;
  whatChanged: string | null;
  whyItMatters: string | null;
  whatIsNowPossible: string | null;
  contributingFactors: OpportunityFactor[];
  assessedAt: string;
};

/** Inputs to the pure assessor — no I/O. */
export type OpportunityAssessorInput = {
  now: Date;
  goalDeadline: string | null;
  /** From Planning Engine — source of truth for remaining work. */
  remainingHoursMin: number;
  remainingHoursMax: number;
  /** Constraint-change facts extracted from History (already filtered). */
  constraintChanges: readonly ConstraintChange[];
};
