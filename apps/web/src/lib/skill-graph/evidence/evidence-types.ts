/**
 * Evidence taxonomy + policy CONFIGURATION (Sprint 7).
 *
 * This module holds the documented domain constants — Evidence types, tiers,
 * confidence ceilings, status thresholds, and default implied-mastery values —
 * as *configuration*. The mastery policy (./mastery-policy) consumes these
 * values and contains no embedded domain numbers of its own, so calibration can
 * change here without touching the reducer logic.
 *
 * Sources: skill-graph-schema.md §4 (status machine), §6 (Evidence types),
 * §7 (tier ceilings); implementation-roadmap.md B.5 / AD-11.
 */

/** Documented Evidence taxonomy (skill-graph-schema.md §6). V1 uses self_report. */
export type EvidenceType =
  | "completed_project"
  | "quiz"
  | "interview"
  | "reflection"
  | "code_review"
  | "github_activity"
  | "course_completion"
  | "boss_battle"
  | "portfolio"
  | "self_report"
  | "self_report_override"
  | "external_validation"
  | "mentor_validation";

export type EvidenceSource = "system" | "user" | "onboarding_interview";

/** Confidence tier: 1 Self Report .. 4 Mentor/External (skill-graph-schema.md §7). */
export type EvidenceTier = 1 | 2 | 3 | 4;

/**
 * Confidence ceiling per tier (skill-graph-schema.md §7). Non-additive
 * (AD-11): confidence can never exceed the ceiling of the highest tier
 * attached, regardless of how many lower-tier records accumulate.
 */
export const TIER_CONFIDENCE_CEILING: Record<EvidenceTier, number> = {
  1: 0.3,
  2: 0.55,
  3: 0.85,
  4: 1.0,
};

/** Which tier each Evidence type carries (implementation-roadmap.md B.5). */
export const EVIDENCE_TYPE_TIER: Record<EvidenceType, EvidenceTier> = {
  self_report: 1,
  self_report_override: 1,
  quiz: 2,
  github_activity: 2,
  course_completion: 2,
  reflection: 2,
  portfolio: 2,
  completed_project: 3,
  code_review: 3,
  boss_battle: 3,
  interview: 3,
  external_validation: 4,
  mentor_validation: 4,
};

/**
 * Status thresholds (skill-graph-schema.md §4). Discrete labels are DERIVED
 * from the continuous mastery/confidence values plus the highest Evidence tier.
 */
export const STATUS_THRESHOLDS = {
  /** `practicing`: mastery at/above this via non-verification-tier Evidence. */
  practicingMastery: 0.4,
  /** `verified`: artifact-tier+ Evidence and mastery/confidence past this. */
  verifiedMastery: 0.7,
  verifiedConfidence: 0.7,
  verifiedMinTier: 2 as EvidenceTier,
  /** `mastered`: sustained high mastery and confidence. */
  masteredMastery: 0.9,
  masteredConfidence: 0.8,
} as const;

// ---------------------------------------------------------------------------
// V1 task-completion Evidence configuration.
//
// Completing a template Task is a self-attested claim (Tier 1). Its implied
// mastery is a calibration constant, NOT logic — tune here, never in the policy.
// ---------------------------------------------------------------------------

/** Evidence type emitted when a Task is completed in V1. */
export const TASK_COMPLETION_EVIDENCE_TYPE: EvidenceType = "self_report";

/** Source recorded for engine-generated task-completion Evidence. */
export const TASK_COMPLETION_EVIDENCE_SOURCE: EvidenceSource = "system";

/**
 * Raw mastery a single self-reported task completion implies (before weighted
 * blending). Represents "can perform guided tasks in this skill". Calibration
 * constant — deliberately below the `verified` threshold since self-report can
 * never verify capability.
 */
export const DEFAULT_SELF_REPORT_IMPLIED_MASTERY = 0.5;

// ---------------------------------------------------------------------------
// V1 Mastery Self-Report Override configuration (Sprint 15 / §5.5).
//
// The user claims a structured implied-mastery level. Labels are UI-only; the
// reducer receives only the numeric impliedMastery. Version the scale so
// calibration changes are attributable (ADR-0012).
// ---------------------------------------------------------------------------

/** Bump when MASTERY_OVERRIDE_SCALE levels or implied values change. */
export const MASTERY_OVERRIDE_SCALE_VERSION = 1;

export const MASTERY_OVERRIDE_LEVEL_IDS = [
  "novice",
  "developing",
  "working",
  "strong",
] as const;

export type MasteryOverrideLevelId =
  (typeof MASTERY_OVERRIDE_LEVEL_IDS)[number];

export type MasteryOverrideLevelConfig = {
  id: MasteryOverrideLevelId;
  /** UI label only — never passed to the mastery reducer. */
  label: string;
  /** Normalized implied mastery for Evidence (0–1). */
  impliedMastery: number;
};

/**
 * Structured override scale (configuration). Map UI selection → impliedMastery
 * here; Evidence service / policy never see labels.
 */
export const MASTERY_OVERRIDE_SCALE: Record<
  MasteryOverrideLevelId,
  MasteryOverrideLevelConfig
> = {
  novice: {
    id: "novice",
    label: "Novice — I am still at the beginning",
    impliedMastery: 0.2,
  },
  developing: {
    id: "developing",
    label: "Developing — I can follow guided work",
    impliedMastery: 0.4,
  },
  working: {
    id: "working",
    label: "Working — I can apply this with effort",
    impliedMastery: 0.55,
  },
  strong: {
    id: "strong",
    label: "Strong — I can apply this reliably (still self-reported)",
    impliedMastery: 0.7,
  },
};

export function isMasteryOverrideLevelId(
  value: string,
): value is MasteryOverrideLevelId {
  return (MASTERY_OVERRIDE_LEVEL_IDS as readonly string[]).includes(value);
}

/** Evidence type for mastery corrections (§5.5). */
export const MASTERY_OVERRIDE_EVIDENCE_TYPE: EvidenceType = "self_report_override";

/** A piece of Evidence as the pure policy consumes it (no persistence fields). */
export type PolicyEvidence = {
  tier: EvidenceTier;
  impliedMastery: number;
};
