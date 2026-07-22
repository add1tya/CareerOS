/**
 * Pure Opportunity assessor (Sprint 16 / M16).
 *
 * Pipeline: Constraint Change → Opportunity Cause → Opportunity Assessment.
 * No I/O. No Risk/Recovery/Decision dependency. Planning supplies remaining
 * hours; this module does not re-derive remaining work (ADR-0013).
 */
import {
  CONSTRAINT_CHANGE_EVENT,
  DEFAULT_HORIZON_WEEKS,
  MIN_HOURS_INCREASE,
  MIN_UNLOCK_FRACTION_OF_REMAINING,
  OPPORTUNITY_ACTIVE_WINDOW_DAYS,
  OPPORTUNITY_POLICY_VERSION,
  type ConstraintChange,
  type OpportunityAssessment,
  type OpportunityAssessorInput,
  type OpportunityCause,
  type OpportunityConfidence,
  type OpportunityFactor,
} from "@/lib/opportunity/opportunity-types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function computeOpportunityAssessment(
  input: OpportunityAssessorInput,
): OpportunityAssessment {
  const assessedAt = input.now.toISOString();
  const candidate = selectQualifyingCause(input);

  if (!candidate) {
    return inactiveAssessment(assessedAt, [
      { key: "active_window_days", value: OPPORTUNITY_ACTIVE_WINDOW_DAYS },
      { key: "qualifying_changes", value: input.constraintChanges.length },
      { key: "constraint_change_event", value: CONSTRAINT_CHANGE_EVENT },
    ]);
  }

  const { cause, weeksRemaining, usedDefaultHorizon, remainingMid, extraCapacity } =
    candidate;

  return {
    opportunityPolicyVersion: OPPORTUNITY_POLICY_VERSION,
    isActive: true,
    cause,
    confidence: confidenceFor(usedDefaultHorizon, remainingMid),
    whatChanged: `Available hours increased from ${cause.constraintChange.previousHours} to ${cause.constraintChange.newHours} per week (+${cause.hoursDelta}).`,
    whyItMatters: whyItMatters(extraCapacity, remainingMid, weeksRemaining),
    whatIsNowPossible: whatIsNowPossible(extraCapacity, weeksRemaining),
    contributingFactors: [
      { key: "previous_hours_per_week", value: cause.constraintChange.previousHours },
      { key: "new_hours_per_week", value: cause.constraintChange.newHours },
      { key: "hours_delta", value: cause.hoursDelta },
      { key: "age_days", value: round2(cause.ageDays) },
      { key: "active_window_days", value: OPPORTUNITY_ACTIVE_WINDOW_DAYS },
      { key: "weeks_remaining", value: round2(weeksRemaining) },
      { key: "used_default_horizon", value: usedDefaultHorizon },
      { key: "remaining_hours_min", value: input.remainingHoursMin },
      { key: "remaining_hours_max", value: input.remainingHoursMax },
      { key: "remaining_hours_mid", value: round2(remainingMid) },
      { key: "extra_capacity_hours", value: round2(extraCapacity) },
    ],
    assessedAt,
  };
}

type QualifyingCandidate = {
  cause: OpportunityCause;
  weeksRemaining: number;
  usedDefaultHorizon: boolean;
  remainingMid: number;
  extraCapacity: number;
};

/**
 * Selects the most recent Constraint Change that forms an active Cause.
 * Future sources can add parallel selectors and compose into Assessment.
 */
function selectQualifyingCause(
  input: OpportunityAssessorInput,
): QualifyingCandidate | null {
  const remainingMid =
    (input.remainingHoursMin + input.remainingHoursMax) / 2;

  if (remainingMid <= 0) {
    return null;
  }

  const { weeksRemaining, usedDefaultHorizon } = weeksRemainingFor(
    input.goalDeadline,
    input.now,
  );

  // Newest first — History list may be unordered; sort by occurredAt desc.
  const sorted = [...input.constraintChanges].sort((a, b) =>
    b.occurredAt.localeCompare(a.occurredAt),
  );

  for (const change of sorted) {
    const hoursDelta = change.newHours - change.previousHours;
    if (hoursDelta < MIN_HOURS_INCREASE) continue;

    const ageDays =
      (input.now.getTime() - new Date(change.occurredAt).getTime()) /
      MS_PER_DAY;
    if (ageDays < 0 || ageDays > OPPORTUNITY_ACTIVE_WINDOW_DAYS) continue;

    const extraCapacity = hoursDelta * weeksRemaining;
    if (extraCapacity < remainingMid * MIN_UNLOCK_FRACTION_OF_REMAINING) {
      continue;
    }

    const cause: OpportunityCause = {
      kind: "constraint_change_unlock",
      constraintChange: change,
      hoursDelta,
      ageDays,
    };

    return {
      cause,
      weeksRemaining,
      usedDefaultHorizon,
      remainingMid,
      extraCapacity,
    };
  }

  return null;
}

function weeksRemainingFor(
  deadline: string | null,
  now: Date,
): { weeksRemaining: number; usedDefaultHorizon: boolean } {
  if (!deadline) {
    return { weeksRemaining: DEFAULT_HORIZON_WEEKS, usedDefaultHorizon: true };
  }

  const end = new Date(`${deadline}T00:00:00`);
  const ms = end.getTime() - now.getTime();
  if (ms <= 0) {
    return { weeksRemaining: DEFAULT_HORIZON_WEEKS, usedDefaultHorizon: true };
  }

  const weeks = ms / (MS_PER_DAY * 7);
  return { weeksRemaining: Math.max(weeks, 1 / 7), usedDefaultHorizon: false };
}

function confidenceFor(
  usedDefaultHorizon: boolean,
  remainingMid: number,
): OpportunityConfidence {
  if (usedDefaultHorizon) return "low";
  if (remainingMid <= 0) return "low";
  return "high";
}

function whyItMatters(
  extraCapacity: number,
  remainingMid: number,
  weeksRemaining: number,
): string {
  const pct =
    remainingMid > 0 ? Math.round((extraCapacity / remainingMid) * 100) : 0;
  return `Over ~${round2(weeksRemaining)} weeks, that increase adds about ${round2(extraCapacity)} hours of capacity — roughly ${pct}% of remaining planned work (from Planning).`;
}

function whatIsNowPossible(
  extraCapacity: number,
  weeksRemaining: number,
): string {
  return `A path that previously needed more time than your budget allowed may now fit within the same horizon (~${round2(extraCapacity)} additional hours across ~${round2(weeksRemaining)} weeks). This is an assessment of capacity, not a change to your recommendation or roadmap.`;
}

function inactiveAssessment(
  assessedAt: string,
  factors: OpportunityFactor[],
): OpportunityAssessment {
  return {
    opportunityPolicyVersion: OPPORTUNITY_POLICY_VERSION,
    isActive: false,
    cause: null,
    confidence: "low",
    whatChanged: null,
    whyItMatters: null,
    whatIsNowPossible: null,
    contributingFactors: factors,
    assessedAt,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Parse History payload into a Constraint Change, or null if incomplete. */
export function constraintChangeFromPayload(
  occurredAt: string,
  payload: Record<string, string | number | boolean | null>,
): ConstraintChange | null {
  const previousHours = Number(payload.previous_hours_per_week);
  const newHours = Number(payload.new_hours_per_week);
  if (!Number.isFinite(previousHours) || !Number.isFinite(newHours)) {
    return null;
  }
  return { previousHours, newHours, occurredAt };
}
