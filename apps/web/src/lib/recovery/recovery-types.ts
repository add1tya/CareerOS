/**
 * Recovery Engine types + Recovery Policy v1 configuration (Sprint 13 / M13).
 *
 * Recovery is a READ MODEL / projection over History (ADR-0010) — never stored
 * mutable recovery state. The policy bundles qualifying events + absence
 * threshold; changing either increments RECOVERY_POLICY_VERSION.
 *
 * Recovery informs UI only. It must never modify ranking, suppression, mastery,
 * or missions (refinement 5).
 */
import type { HistoryEventType } from "@/lib/history/history-types";

/**
 * Version of Recovery Policy v1 (qualifying events + absence threshold).
 * Bump when either part of the policy changes.
 */
export const RECOVERY_POLICY_VERSION = 1;

/**
 * History event types that count as real engagement for absence detection.
 * Passive names here — the detector references this set, never hardcodes strings.
 */
export const QUALIFYING_RECOVERY_EVENTS: readonly HistoryEventType[] = [
  "task_completed",
  "evidence_recorded",
  "reflection_confirmed",
] as const;

/**
 * Days without a qualifying History event before status becomes `absent`.
 * Configuration, not logic buried in the detector.
 */
export const ABSENCE_THRESHOLD_DAYS = 7;

export type RecoveryStatus = "engaged" | "absent" | "no_activity_yet";

/**
 * Computed Recovery projection. Not persisted.
 * `now` is supplied by the caller so the detector stays pure.
 */
export type RecoveryState = {
  recoveryPolicyVersion: number;
  status: RecoveryStatus;
  absenceThresholdDays: number;
  /** Whole days since last qualifying event; null if none exist. */
  daysSinceLastActivity: number | null;
  lastQualifyingEventAt: string | null;
  lastQualifyingEventType: HistoryEventType | null;
};

/** Minimal History fact the pure detector needs. */
export type RecoveryHistoryFact = {
  eventType: HistoryEventType;
  occurredAt: string;
};
