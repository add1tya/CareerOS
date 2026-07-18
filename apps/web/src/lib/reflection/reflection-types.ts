/**
 * Reflection v1 types + CONFIGURATION (Sprint 8).
 *
 * As with the Evidence subsystem, domain constants live here as configuration
 * (the self-assessment scale and its implied-mastery mapping), never embedded in
 * the engine logic. The pure Reflection Engine consumes these values.
 *
 * Reflection produces Tier-2 (Artifact) Evidence (skill-graph-schema.md §6/§7):
 * confirming a reflection can raise a skill's Confidence toward the Tier-2
 * ceiling (~0.55) and nudge Mastery via the standard weighted blend.
 */
import type { EvidenceType } from "@/lib/skill-graph/evidence/evidence-types";

/** Version of the rule-based Reflection Engine (snapshotted on each reflection). */
export const REFLECTION_ENGINE_VERSION = 1;

/** V1 trigger set; only `user_initiated` is written (PR-17 / EX-11). */
export type ReflectionTrigger = "milestone" | "user_initiated" | "recovery_check_in";

export type ReflectionStatus = "proposed" | "confirmed" | "declined";

/** The Evidence type reflections produce. */
export const REFLECTION_EVIDENCE_TYPE: EvidenceType = "reflection";

/**
 * Structured self-assessment scale. The user picks exactly one level; the engine
 * maps it deterministically to a proposed implied mastery. Free text is captured
 * separately as qualitative context and never parsed for mastery signal.
 */
export type SelfAssessmentLevel = "shaky" | "comfortable" | "confident";

export type SelfAssessmentConfig = {
  level: SelfAssessmentLevel;
  label: string;
  /** Raw mastery this self-assessment implies, before weighted blending. */
  impliedMastery: number;
  /** Human-readable justification surfaced in the proposal. */
  rationale: string;
};

/**
 * Calibration configuration (not logic). Implied-mastery values are deliberately
 * modest: reflection is self-authored, so its confidence effect is capped at the
 * Tier-2 ceiling regardless of the level chosen.
 */
export const SELF_ASSESSMENT_SCALE: Record<SelfAssessmentLevel, SelfAssessmentConfig> = {
  shaky: {
    level: "shaky",
    label: "Still shaky — I need more practice",
    impliedMastery: 0.35,
    rationale: "Self-assessed as still developing; a small, low-confidence signal.",
  },
  comfortable: {
    level: "comfortable",
    label: "Getting comfortable — I can do this with some effort",
    impliedMastery: 0.55,
    rationale: "Self-assessed as working proficiency on guided work.",
  },
  confident: {
    level: "confident",
    label: "Confident — I can do this reliably on my own",
    impliedMastery: 0.7,
    rationale: "Self-assessed as reliable independent capability (still unverified).",
  },
};

export const SELF_ASSESSMENT_LEVELS: readonly SelfAssessmentLevel[] = [
  "shaky",
  "comfortable",
  "confident",
];

export function isSelfAssessmentLevel(value: string): value is SelfAssessmentLevel {
  return (SELF_ASSESSMENT_LEVELS as readonly string[]).includes(value);
}

/** The prompt shown to the user, stored verbatim on the reflection for provenance. */
export const REFLECTION_PROMPT =
  "How confident do you feel about this skill right now, based on your recent work?";

// ---------------------------------------------------------------------------
// Pure engine input/output contracts.
// ---------------------------------------------------------------------------

/** Everything the pure Reflection Engine needs — no users, persistence, or IO. */
export type ReflectionInput = {
  skillKey: string;
  selfAssessment: SelfAssessmentLevel;
};

/**
 * A single proposed update. V1 always proposes exactly one Reflection Evidence
 * for the reflected skill. The list shape is kept for forward-compatibility.
 */
export type DerivedUpdate = {
  kind: "reflection_evidence";
  skillKey: string;
  evidenceType: EvidenceType;
  tier: 2;
  impliedMastery: number;
  rationale: string;
};

/** A persisted reflection as the app reads it. */
export type Reflection = {
  id: string;
  trigger: ReflectionTrigger;
  skillKey: string;
  promptShown: string;
  selfAssessment: SelfAssessmentLevel;
  responseText: string | null;
  derivedUpdates: DerivedUpdate[];
  status: ReflectionStatus;
  confirmedAt: string | null;
  reflectionEngineVersion: number;
  masteryPolicyVersion: number;
  evaluatedMastery: number;
  evaluatedConfidence: number;
  evaluatedStatus: string;
  createdAt: string;
};
