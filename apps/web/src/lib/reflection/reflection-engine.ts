/**
 * Reflection Engine (Sprint 8) — PURE, DETERMINISTIC, rule-based (roadmap
 * Phase 5 item 14).
 *
 * Sole responsibility: Reflection Input -> Proposed Updates. It knows nothing
 * about persistence, users, Evidence, confirmation, or server actions
 * (refinement 4). Identical input -> identical proposal; no I/O, clock, or
 * randomness, and no free-text interpretation (structured input only).
 */
import {
  REFLECTION_EVIDENCE_TYPE,
  SELF_ASSESSMENT_SCALE,
  type DerivedUpdate,
  type ReflectionInput,
} from "./reflection-types";

/**
 * Maps a structured self-assessment to the proposed updates it implies. V1
 * always yields exactly one Reflection-type (Tier 2) Evidence proposal for the
 * reflected skill.
 */
export function deriveUpdates(input: ReflectionInput): DerivedUpdate[] {
  const config = SELF_ASSESSMENT_SCALE[input.selfAssessment];

  return [
    {
      kind: "reflection_evidence",
      skillKey: input.skillKey,
      evidenceType: REFLECTION_EVIDENCE_TYPE,
      tier: 2,
      impliedMastery: config.impliedMastery,
      rationale: config.rationale,
    },
  ];
}
