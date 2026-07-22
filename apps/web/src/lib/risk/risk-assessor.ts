/**
 * Pure Risk assessor (Sprint 14 / M14).
 *
 * Computes pace, scope, and burnout INDEPENDENTLY from RiskAssessorInput, then
 * assembles RiskAssessment. No I/O. No Recovery dependency. Planning supplies
 * remaining hours; this module does not re-derive remaining work (ADR-0011).
 */
import {
  BURNOUT_EVENTS_PER_AVAILABLE_HOUR,
  BURNOUT_THRESHOLDS,
  CONFIDENCE_RULES,
  PACE_EXPECTED_EVENTS_PER_WEEK,
  PACE_THRESHOLDS,
  RISK_ASSESSMENT_WINDOW_DAYS,
  RISK_ENGAGEMENT_EVENTS,
  RISK_PANEL_MIN_LEVEL,
  RISK_POLICY_VERSION,
  SCOPE_THRESHOLDS,
  type DimensionAssessment,
  type RiskAssessorInput,
  type RiskAssessment,
  type RiskConfidence,
  type RiskHistoryFact,
  type RiskLevel,
} from "@/lib/risk/risk-types";

const ENGAGEMENT_SET = new Set<string>(RISK_ENGAGEMENT_EVENTS);
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const LEVEL_RANK: Record<RiskLevel, number> = {
  low: 0,
  moderate: 1,
  elevated: 2,
  high: 3,
};

export function computeRiskAssessment(input: RiskAssessorInput): RiskAssessment {
  const pace = assessPace(input);
  const scope = assessScope(input);
  const burnout = assessBurnout(input);

  const isElevated =
    LEVEL_RANK[pace.level] >= LEVEL_RANK[RISK_PANEL_MIN_LEVEL] ||
    LEVEL_RANK[scope.level] >= LEVEL_RANK[RISK_PANEL_MIN_LEVEL] ||
    LEVEL_RANK[burnout.level] >= LEVEL_RANK[RISK_PANEL_MIN_LEVEL];

  return {
    riskPolicyVersion: RISK_POLICY_VERSION,
    isElevated,
    pace,
    scope,
    burnout,
    assessedAt: input.now.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Pace — engagement rate vs expected (independent of remaining work / deadline)
// ---------------------------------------------------------------------------

function assessPace(input: RiskAssessorInput): DimensionAssessment {
  const inWindow = engagementInWindow(input.history, input.now);
  const windowWeeks = RISK_ASSESSMENT_WINDOW_DAYS / 7;
  const eventsPerWeek = inWindow.length / windowWeeks;
  const ratio =
    PACE_EXPECTED_EVENTS_PER_WEEK > 0
      ? eventsPerWeek / PACE_EXPECTED_EVENTS_PER_WEEK
      : 1;

  const confidence = confidenceFromEventCount(inWindow.length);
  const level = paceLevelFromRatio(ratio, inWindow.length);

  return {
    dimension: "pace",
    level,
    confidence,
    rationale: paceRationale(level, eventsPerWeek, inWindow.length),
    contributingFactors: [
      { key: "window_days", value: RISK_ASSESSMENT_WINDOW_DAYS },
      { key: "engagement_events_in_window", value: inWindow.length },
      { key: "events_per_week", value: round2(eventsPerWeek) },
      { key: "expected_events_per_week", value: PACE_EXPECTED_EVENTS_PER_WEEK },
      { key: "pace_ratio", value: round2(ratio) },
    ],
  };
}

function paceLevelFromRatio(ratio: number, eventCount: number): RiskLevel {
  if (eventCount === 0) return "elevated";
  if (ratio >= PACE_THRESHOLDS.lowMinRatio) return "low";
  if (ratio >= PACE_THRESHOLDS.moderateMinRatio) return "moderate";
  if (ratio >= PACE_THRESHOLDS.elevatedMinRatio) return "elevated";
  return "high";
}

function paceRationale(
  level: RiskLevel,
  eventsPerWeek: number,
  eventCount: number,
): string {
  if (eventCount === 0) {
    return "No qualifying engagement in the assessment window — pace signal is weak and treated as elevated until activity resumes.";
  }
  return `Recent engagement is about ${round2(eventsPerWeek)} qualifying events/week (policy expects ~${PACE_EXPECTED_EVENTS_PER_WEEK}). Pace risk is ${level}.`;
}

// ---------------------------------------------------------------------------
// Scope — Planning remaining effort vs capacity to deadline (no event counts)
// ---------------------------------------------------------------------------

function assessScope(input: RiskAssessorInput): DimensionAssessment {
  const remainingMid =
    (input.remainingHoursMin + input.remainingHoursMax) / 2;
  const hoursPerWeek = input.availableHoursPerWeek;
  const weeksRemaining = weeksUntilDeadline(input.goalDeadline, input.now);

  const factors = [
    { key: "remaining_hours_min", value: input.remainingHoursMin },
    { key: "remaining_hours_max", value: input.remainingHoursMax },
    { key: "remaining_hours_mid", value: round2(remainingMid) },
    { key: "available_hours_per_week", value: hoursPerWeek },
    { key: "goal_deadline", value: input.goalDeadline },
    { key: "weeks_remaining", value: weeksRemaining },
  ];

  if (hoursPerWeek === null || hoursPerWeek <= 0) {
    return {
      dimension: "scope",
      level: "moderate",
      confidence: "low",
      rationale:
        "Available hours per week are missing or zero — scope cannot be compared to capacity with confidence.",
      contributingFactors: factors,
    };
  }

  if (weeksRemaining === null) {
    return {
      dimension: "scope",
      level: "moderate",
      confidence: "low",
      rationale:
        "No goal deadline is set — scope pressure relative to a date cannot be assessed tightly.",
      contributingFactors: factors,
    };
  }

  if (weeksRemaining <= 0) {
    return {
      dimension: "scope",
      level: remainingMid > 0 ? "high" : "low",
      confidence: "medium",
      rationale:
        remainingMid > 0
          ? "The goal deadline is at or past, with remaining planned effort still on the Roadmap."
          : "The goal deadline is at or past, and Planning reports no remaining effort.",
      contributingFactors: factors,
    };
  }

  const capacityHours = hoursPerWeek * weeksRemaining;
  const ratio = capacityHours > 0 ? remainingMid / capacityHours : Infinity;
  const level = scopeLevelFromRatio(ratio);

  return {
    dimension: "scope",
    level,
    confidence: "high",
    rationale: `Planning remaining effort (~${round2(remainingMid)}h) vs capacity to deadline (~${round2(capacityHours)}h) yields load ratio ${round2(ratio)}. Scope risk is ${level}.`,
    contributingFactors: [
      ...factors,
      { key: "capacity_hours", value: round2(capacityHours) },
      { key: "scope_load_ratio", value: round2(ratio) },
    ],
  };
}

function scopeLevelFromRatio(ratio: number): RiskLevel {
  if (ratio <= SCOPE_THRESHOLDS.lowMaxRatio) return "low";
  if (ratio <= SCOPE_THRESHOLDS.moderateMaxRatio) return "moderate";
  if (ratio <= SCOPE_THRESHOLDS.elevatedMaxRatio) return "elevated";
  return "high";
}

// ---------------------------------------------------------------------------
// Burnout — recent intensity vs weekly hour budget (no deadline / remaining)
// ---------------------------------------------------------------------------

function assessBurnout(input: RiskAssessorInput): DimensionAssessment {
  const inWindow = engagementInWindow(input.history, input.now);
  const hoursPerWeek = input.availableHoursPerWeek;
  const windowWeeks = RISK_ASSESSMENT_WINDOW_DAYS / 7;
  const confidence = confidenceFromEventCount(inWindow.length);

  const factors = [
    { key: "window_days", value: RISK_ASSESSMENT_WINDOW_DAYS },
    { key: "engagement_events_in_window", value: inWindow.length },
    { key: "available_hours_per_week", value: hoursPerWeek },
  ];

  if (hoursPerWeek === null || hoursPerWeek <= 0) {
    return {
      dimension: "burnout",
      level: "low",
      confidence: "low",
      rationale:
        "Without a weekly hour budget, burnout intensity cannot be compared to capacity — treated as low with low confidence.",
      contributingFactors: factors,
    };
  }

  const capacityProxy =
    hoursPerWeek * windowWeeks * BURNOUT_EVENTS_PER_AVAILABLE_HOUR;
  const ratio =
    capacityProxy > 0 ? inWindow.length / capacityProxy : inWindow.length > 0 ? Infinity : 0;
  const level = burnoutLevelFromRatio(ratio);

  return {
    dimension: "burnout",
    level,
    confidence,
    rationale: `Engagement intensity in the last ${RISK_ASSESSMENT_WINDOW_DAYS} days (${inWindow.length} events) vs a capacity proxy (~${round2(capacityProxy)}) yields intensity ratio ${round2(ratio)}. Burnout risk is ${level}.`,
    contributingFactors: [
      ...factors,
      { key: "capacity_event_proxy", value: round2(capacityProxy) },
      { key: "burnout_intensity_ratio", value: round2(ratio) },
    ],
  };
}

function burnoutLevelFromRatio(ratio: number): RiskLevel {
  if (ratio <= BURNOUT_THRESHOLDS.lowMaxRatio) return "low";
  if (ratio <= BURNOUT_THRESHOLDS.moderateMaxRatio) return "moderate";
  if (ratio <= BURNOUT_THRESHOLDS.elevatedMaxRatio) return "elevated";
  return "high";
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function engagementInWindow(
  history: readonly RiskHistoryFact[],
  now: Date,
): RiskHistoryFact[] {
  const cutoff = now.getTime() - RISK_ASSESSMENT_WINDOW_DAYS * MS_PER_DAY;
  return history.filter((fact) => {
    if (!ENGAGEMENT_SET.has(fact.eventType)) return false;
    const t = Date.parse(fact.occurredAt);
    return !Number.isNaN(t) && t >= cutoff && t <= now.getTime();
  });
}

function confidenceFromEventCount(count: number): RiskConfidence {
  if (count >= CONFIDENCE_RULES.highMinEvents) return "high";
  if (count >= CONFIDENCE_RULES.mediumMinEvents) return "medium";
  return "low";
}

function weeksUntilDeadline(deadline: string | null, now: Date): number | null {
  if (!deadline) return null;
  const end = Date.parse(`${deadline}T23:59:59`);
  if (Number.isNaN(end)) return null;
  return (end - now.getTime()) / (7 * MS_PER_DAY);
}

function round2(n: number): number {
  if (!Number.isFinite(n)) return n;
  return Math.round(n * 100) / 100;
}
