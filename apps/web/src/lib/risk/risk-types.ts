/**
 * Risk Assessment types + Risk Policy v1 (Sprint 14 / M14).
 *
 * Risk is a READ MODEL / projection over Goals, Constraints, History, and
 * Planning remaining effort (ADR-0011). Never stored as mutable state.
 *
 * Policy v1 owns thresholds, windows, formulas, and confidence rules — bump
 * RISK_POLICY_VERSION when any of those change.
 *
 * Risk informs UI only. It must never modify Decision ranking, suppression,
 * mastery, or missions.
 */
import type { HistoryEventType } from "@/lib/history/history-types";

/** Bump when thresholds, windows, formulas, or confidence rules change. */
export const RISK_POLICY_VERSION = 1;

export const RISK_LEVELS = ["low", "moderate", "elevated", "high"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const RISK_DIMENSIONS = ["pace", "scope", "burnout"] as const;
export type RiskDimensionId = (typeof RISK_DIMENSIONS)[number];

/** Confidence in a dimension assessment (sparse History → lower). */
export const RISK_CONFIDENCE = ["low", "medium", "high"] as const;
export type RiskConfidence = (typeof RISK_CONFIDENCE)[number];

// ---------------------------------------------------------------------------
// Risk Policy v1 — configuration (not buried in assessor logic)
// ---------------------------------------------------------------------------

/** Trailing window for engagement / intensity signals (days). */
export const RISK_ASSESSMENT_WINDOW_DAYS = 14;

/**
 * History events that count as engagement for pace & burnout intensity.
 * Kept local to Risk Policy (flat graph — not imported from Recovery).
 */
export const RISK_ENGAGEMENT_EVENTS: readonly HistoryEventType[] = [
  "task_completed",
  "evidence_recorded",
  "reflection_confirmed",
] as const;

/** Minimum engagement events per week inside the window for healthy pace. */
export const PACE_EXPECTED_EVENTS_PER_WEEK = 2;

/** Pace: events/week ratios vs expected → level thresholds. */
export const PACE_THRESHOLDS = {
  /** ratio >= this → low risk */
  lowMinRatio: 0.75,
  /** ratio >= this → moderate (else elevated/high) */
  moderateMinRatio: 0.4,
  /** ratio >= this → elevated (else high) */
  elevatedMinRatio: 0.15,
} as const;

/**
 * Scope: remainingHoursMid / (hoursPerWeek * weeksRemaining).
 * Higher ratio = more scope pressure.
 */
export const SCOPE_THRESHOLDS = {
  lowMaxRatio: 0.85,
  moderateMaxRatio: 1.15,
  elevatedMaxRatio: 1.6,
} as const;

/**
 * Burnout: engagement events in window vs capacity proxy
 * (hoursPerWeek * windowWeeks * EVENTS_PER_HOUR_PROXY).
 * Higher intensity ratio = more burnout pressure.
 */
export const BURNOUT_EVENTS_PER_AVAILABLE_HOUR = 0.35;
export const BURNOUT_THRESHOLDS = {
  lowMaxRatio: 0.9,
  moderateMaxRatio: 1.25,
  elevatedMaxRatio: 1.75,
} as const;

/** Confidence: based on count of engagement events in the assessment window. */
export const CONFIDENCE_RULES = {
  /** Fewer than this in window → low confidence */
  mediumMinEvents: 2,
  /** At least this in window → high confidence */
  highMinEvents: 5,
} as const;

/** Panel visibility: show when any dimension reaches this level or higher. */
export const RISK_PANEL_MIN_LEVEL: RiskLevel = "elevated";

// ---------------------------------------------------------------------------
// Assessment shapes
// ---------------------------------------------------------------------------

export type RiskFactor = {
  key: string;
  value: string | number | boolean | null;
};

export type DimensionAssessment = {
  dimension: RiskDimensionId;
  level: RiskLevel;
  confidence: RiskConfidence;
  rationale: string;
  contributingFactors: RiskFactor[];
};

export type RiskAssessment = {
  riskPolicyVersion: number;
  /** True when any dimension level is >= RISK_PANEL_MIN_LEVEL. */
  isElevated: boolean;
  pace: DimensionAssessment;
  scope: DimensionAssessment;
  burnout: DimensionAssessment;
  assessedAt: string;
};

/** Inputs to the pure assessor — no I/O. */
export type RiskAssessorInput = {
  now: Date;
  goalDeadline: string | null;
  availableHoursPerWeek: number | null;
  /** From Planning Engine — source of truth for remaining work. */
  remainingHoursMin: number;
  remainingHoursMax: number;
  history: readonly RiskHistoryFact[];
};

export type RiskHistoryFact = {
  eventType: HistoryEventType;
  occurredAt: string;
};
