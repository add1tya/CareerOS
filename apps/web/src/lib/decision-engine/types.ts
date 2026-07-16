/**
 * Decision Engine v1 types (Sprint 5 / M5).
 *
 * The Decision Engine answers exactly one question deterministically:
 * "What is the single highest-value skill to learn next, and why?"
 * The recommendation is a Skill, never a Task. No AI is involved.
 */

/**
 * Deterministic Decision Engine confidence — how decisively the winner beat the
 * next-best candidate on the documented ranking factors. This is NOT AI
 * confidence; it is derived purely from the lexicographic ranking outcome.
 */
export type RecommendationConfidence = "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";

/** One factor's computed value for one candidate. */
export type FactorValue = {
  factorId: string;
  label: string;
  /** Normalized comparable value — LOWER is always better (ascending sort). */
  rawValue: number;
  /** Human-readable rendering of the underlying value, for the inspector. */
  display: string;
};

/** A candidate skill with its full factor breakdown, in ranked order. */
export type RankedCandidate = {
  skillKey: string;
  name: string;
  factors: FactorValue[];
};

/** Result of ranking the available-skill candidate pool. */
export type RankingResult = {
  ranked: RankedCandidate[];
  winner: RankedCandidate | null;
  runnerUp: RankedCandidate | null;
  /** The first factor at which winner and runner-up diverged (drives confidence). */
  decidingFactorId: string | null;
  confidence: RecommendationConfidence;
};

/** Assembled recommendation for display and persistence. */
export type SkillRecommendation = {
  recommendedSkillKey: string;
  skillName: string;
  narrative: string;
  confidence: RecommendationConfidence;
  goalId: string | null;
  goalTitle: string | null;
  generatedAt: string | null;
};

/** What the dashboard consumes: the recommendation (card) + ranking (inspector). */
export type DecisionEngineOutput = {
  recommendation: SkillRecommendation | null;
  ranking: RankingResult;
};
