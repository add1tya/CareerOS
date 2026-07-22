/**
 * Recovery detector (Sprint 13 / M13) — PURE.
 *
 * Projects RecoveryState from History facts + policy config + an injected `now`.
 * No I/O, no mutable recovery flags, no domain writes (ADR-0010).
 */
import {
  ABSENCE_THRESHOLD_DAYS,
  QUALIFYING_RECOVERY_EVENTS,
  RECOVERY_POLICY_VERSION,
  type RecoveryHistoryFact,
  type RecoveryState,
} from "@/lib/recovery/recovery-types";

const QUALIFYING_SET = new Set<string>(QUALIFYING_RECOVERY_EVENTS);

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Deterministic Recovery projection.
 *
 * @param facts - History events (any order; detector finds latest qualifying).
 * @param now - Instant for "today"; injected so the function stays pure/testable.
 */
export function computeRecoveryState(
  facts: readonly RecoveryHistoryFact[],
  now: Date,
): RecoveryState {
  let latest: RecoveryHistoryFact | null = null;

  for (const fact of facts) {
    if (!QUALIFYING_SET.has(fact.eventType)) continue;
    if (!latest || fact.occurredAt > latest.occurredAt) {
      latest = fact;
    }
  }

  if (!latest) {
    return {
      recoveryPolicyVersion: RECOVERY_POLICY_VERSION,
      status: "no_activity_yet",
      absenceThresholdDays: ABSENCE_THRESHOLD_DAYS,
      daysSinceLastActivity: null,
      lastQualifyingEventAt: null,
      lastQualifyingEventType: null,
    };
  }

  const lastMs = Date.parse(latest.occurredAt);
  const nowMs = now.getTime();
  const daysSinceLastActivity = Math.max(
    0,
    Math.floor((nowMs - lastMs) / MS_PER_DAY),
  );

  const status =
    daysSinceLastActivity >= ABSENCE_THRESHOLD_DAYS ? "absent" : "engaged";

  return {
    recoveryPolicyVersion: RECOVERY_POLICY_VERSION,
    status,
    absenceThresholdDays: ABSENCE_THRESHOLD_DAYS,
    daysSinceLastActivity,
    lastQualifyingEventAt: latest.occurredAt,
    lastQualifyingEventType: latest.eventType,
  };
}
