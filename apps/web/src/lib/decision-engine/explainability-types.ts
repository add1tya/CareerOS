/**
 * Decision Explainability types + policy v1 (Sprint 17 / M17).
 *
 * Explainability is a READ MODEL / projection over immutable decision facts
 * (skill_recommendations.factors). It must never influence ranking, eligibility,
 * suppression, planning, or mastery (ADR-0014).
 *
 * Pipeline:
 *   Decision Factors (persisted snapshot)
 *     → Explanation Facts
 *       → Decision Explanation
 *         → UI
 *
 * DECISION_EXPLANATION_VERSION is independent of ranking factor order /
 * comparator changes.
 *
 * Note: confidence enum is a local string union to avoid a circular import with
 * decision-engine/types (which imports DecisionExplanation).
 */

/** Bump when explanation structure or declarative copy rules change. */
export const DECISION_EXPLANATION_VERSION = 1;

/** Same values as RecommendationConfidence — kept local to avoid import cycles. */
export type ExplanationConfidence = "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";

/** Human labels for known factor ids (presentation config — not ranking). */
export const EXPLANATION_FACTOR_LABELS: Record<string, string> = {
  goal_impact: "Goal impact (ontology category)",
  dependency_unlock: "Dependency unlock value",
  estimated_effort: "Estimated effort",
  transferability: "Transferability",
  stable_order: "Stable ontology order",
};

export function labelForFactorId(factorId: string): string {
  return EXPLANATION_FACTOR_LABELS[factorId] ?? factorId;
}

// ---------------------------------------------------------------------------
// Persisted Decision Factors (authoritative snapshot shape)
// ---------------------------------------------------------------------------

export type PersistedFactorValue = {
  factor_id: string;
  raw_value: number;
  display: string;
};

export type PersistedCandidate = {
  rank: number;
  skill_key: string;
  name: string;
  factors: PersistedFactorValue[];
};

/**
 * JSON stored on skill_recommendations.factors at recommendation write time.
 * Authoritative for historical explanations (GP-11 / ADR-0014).
 */
export type PersistedDecisionFactors = {
  deciding_factor_id: string | null;
  confidence: ExplanationConfidence;
  winner_skill_key: string | null;
  candidates: PersistedCandidate[];
};

// ---------------------------------------------------------------------------
// Explanation Facts (winner + runner-up only)
// ---------------------------------------------------------------------------

export type ExplanationFactorFact = {
  factorId: string;
  label: string;
  rawValue: number;
  display: string;
};

export type ExplanationCandidateFact = {
  skillKey: string;
  name: string;
  factors: ExplanationFactorFact[];
};

/**
 * Normalized facts for the builder. Only winner and runner-up — never the rest
 * of the candidate pool.
 */
export type ExplanationFacts = {
  winner: ExplanationCandidateFact;
  runnerUp: ExplanationCandidateFact | null;
  decidingFactorId: string | null;
  confidence: ExplanationConfidence;
  goalTitle: string | null;
};

// ---------------------------------------------------------------------------
// Decision Explanation (declarative answers — UI renders these)
// ---------------------------------------------------------------------------

export type DecisionExplanation = {
  decisionExplanationVersion: number;
  winnerName: string;
  runnerUpName: string | null;
  decidingFactorId: string | null;
  confidence: ExplanationConfidence;
  /** Observable ranking / factor facts about the winner. */
  whyThisSkill: string;
  /** Eligibility / timing facts; notes deferred ranking inputs. */
  whyNow: string;
  /** Winner vs runner-up only. */
  whyNotOther: string;
  /** Observable consequences of skip/override — no urgency manufacturing. */
  ifSkipped: string;
  /** Goal + ontology-category proxy facts. */
  goalAlignment: string;
};
