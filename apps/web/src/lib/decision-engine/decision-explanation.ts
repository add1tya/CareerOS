/**
 * Pure Decision Explainability builder (Sprint 17 / M17).
 *
 * Pipeline: Persisted Decision Factors → Explanation Facts → Decision Explanation.
 * No I/O. Does not call ranking. Never influences Decision / Planning / mastery
 * (ADR-0014).
 *
 * Historical explanations MUST use the immutable persisted factor snapshot —
 * never today's live RankingResult for a past recommendation row.
 */
import {
  DECISION_EXPLANATION_VERSION,
  labelForFactorId,
  type DecisionExplanation,
  type ExplanationCandidateFact,
  type ExplanationConfidence,
  type ExplanationFacts,
  type ExplanationFactorFact,
  type PersistedCandidate,
  type PersistedDecisionFactors,
} from "@/lib/decision-engine/explainability-types";

/**
 * Parses the authoritative JSON snapshot from skill_recommendations.factors.
 * Returns null if the payload is missing or malformed.
 */
export function parsePersistedDecisionFactors(
  raw: unknown,
): PersistedDecisionFactors | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const confidence = obj.confidence;
  if (
    confidence !== "LOW" &&
    confidence !== "MEDIUM" &&
    confidence !== "HIGH" &&
    confidence !== "VERY_HIGH"
  ) {
    return null;
  }

  if (!Array.isArray(obj.candidates)) return null;

  const candidates: PersistedCandidate[] = [];
  for (const entry of obj.candidates) {
    if (!entry || typeof entry !== "object") continue;
    const c = entry as Record<string, unknown>;
    if (typeof c.skill_key !== "string" || typeof c.name !== "string") continue;
    if (!Array.isArray(c.factors)) continue;

    const factors = [];
    for (const f of c.factors) {
      if (!f || typeof f !== "object") continue;
      const fv = f as Record<string, unknown>;
      if (typeof fv.factor_id !== "string") continue;
      if (typeof fv.raw_value !== "number") continue;
      if (typeof fv.display !== "string") continue;
      factors.push({
        factor_id: fv.factor_id,
        raw_value: fv.raw_value,
        display: fv.display,
      });
    }

    candidates.push({
      rank: typeof c.rank === "number" ? c.rank : candidates.length + 1,
      skill_key: c.skill_key,
      name: c.name,
      factors,
    });
  }

  if (candidates.length === 0) return null;

  return {
    deciding_factor_id:
      typeof obj.deciding_factor_id === "string" ? obj.deciding_factor_id : null,
    confidence,
    winner_skill_key:
      typeof obj.winner_skill_key === "string" ? obj.winner_skill_key : null,
    candidates,
  };
}

/**
 * Projects persisted factors into Explanation Facts (winner + runner-up only).
 */
export function explanationFactsFromPersisted(
  persisted: PersistedDecisionFactors,
  goalTitle: string | null,
): ExplanationFacts | null {
  const sorted = [...persisted.candidates].sort((a, b) => a.rank - b.rank);
  const winnerRow =
    sorted.find((c) => c.skill_key === persisted.winner_skill_key) ?? sorted[0];
  if (!winnerRow) return null;

  const runnerUpRow =
    sorted.find((c) => c.skill_key !== winnerRow.skill_key) ?? null;

  return {
    winner: toCandidateFact(winnerRow),
    runnerUp: runnerUpRow ? toCandidateFact(runnerUpRow) : null,
    decidingFactorId: persisted.deciding_factor_id,
    confidence: persisted.confidence,
    goalTitle,
  };
}

/**
 * Builds declarative Decision Explanation from Explanation Facts.
 * Copy describes observable facts only — no recommendations, predictions,
 * speculation, or motivational language.
 */
export function buildDecisionExplanation(
  facts: ExplanationFacts,
): DecisionExplanation {
  return {
    decisionExplanationVersion: DECISION_EXPLANATION_VERSION,
    winnerName: facts.winner.name,
    runnerUpName: facts.runnerUp?.name ?? null,
    decidingFactorId: facts.decidingFactorId,
    confidence: facts.confidence,
    whyThisSkill: whyThisSkill(facts),
    whyNow: whyNow(facts),
    whyNotOther: whyNotOther(facts),
    ifSkipped: ifSkipped(facts),
    goalAlignment: goalAlignment(facts),
  };
}

/**
 * Full projection: persisted snapshot → explanation (or null if unusable).
 */
export function explainFromPersistedFactors(
  rawFactors: unknown,
  goalTitle: string | null,
): DecisionExplanation | null {
  const persisted = parsePersistedDecisionFactors(rawFactors);
  if (!persisted) return null;
  const facts = explanationFactsFromPersisted(persisted, goalTitle);
  if (!facts) return null;
  return buildDecisionExplanation(facts);
}

function toCandidateFact(row: PersistedCandidate): ExplanationCandidateFact {
  return {
    skillKey: row.skill_key,
    name: row.name,
    factors: row.factors.map(
      (f): ExplanationFactorFact => ({
        factorId: f.factor_id,
        label: labelForFactorId(f.factor_id),
        rawValue: f.raw_value,
        display: f.display,
      }),
    ),
  };
}

function factorDisplay(
  candidate: ExplanationCandidateFact,
  factorId: string,
): string | null {
  return candidate.factors.find((f) => f.factorId === factorId)?.display ?? null;
}

function whyThisSkill(facts: ExplanationFacts): string {
  const parts = facts.winner.factors.map((f) => `${f.label}: ${f.display}`);
  return `${facts.winner.name} is rank 1 in the persisted decision snapshot. Factor values: ${parts.join("; ")}.`;
}

function whyNow(facts: ExplanationFacts): string {
  return `${facts.winner.name} was in the eligible candidate pool when this decision was recorded (prerequisites met; not mastered; not suppressed at write time). Risk and momentum are not ranking inputs in V1 — they do not appear in this snapshot.`;
}

function whyNotOther(facts: ExplanationFacts): string {
  if (!facts.runnerUp) {
    return `No runner-up was present in the persisted snapshot — ${facts.winner.name} was the sole eligible candidate.`;
  }

  const deciding = facts.decidingFactorId;
  if (!deciding) {
    return `${facts.winner.name} ranked above ${facts.runnerUp.name}. The persisted snapshot does not record a deciding factor (candidates were identical on all factors).`;
  }

  const winnerVal = factorDisplay(facts.winner, deciding);
  const runnerVal = factorDisplay(facts.runnerUp, deciding);
  const label = labelForFactorId(deciding);

  return `Compared with runner-up ${facts.runnerUp.name}, the first differing factor was ${label}. ${facts.winner.name}: ${winnerVal ?? "—"}; ${facts.runnerUp.name}: ${runnerVal ?? "—"}.`;
}

function ifSkipped(facts: ExplanationFacts): string {
  const unlock = factorDisplay(facts.winner, "dependency_unlock");
  const unlockClause = unlock
    ? ` In this snapshot, dependency unlock value for ${facts.winner.name} is ${unlock}.`
    : "";
  return `Skipping does not, by itself, change eligibility. A recommendation override suppresses ${facts.winner.name} until new Evidence is recorded on that skill. Ranking factor values are unchanged by an override.${unlockClause}`;
}

function goalAlignment(facts: ExplanationFacts): string {
  const goal = facts.goalTitle
    ? `Active goal at explanation time: "${facts.goalTitle}".`
    : "No active goal title was provided for this explanation.";
  const tier = factorDisplay(facts.winner, "goal_impact");
  const tierClause = tier
    ? ` ${facts.winner.name} has ontology category ${tier} (V1 proxy for goal impact; skill_goal_relevance is not modeled yet).`
    : "";
  return `${goal}${tierClause}`;
}

export function isExplanationConfidence(
  value: unknown,
): value is ExplanationConfidence {
  return (
    value === "LOW" ||
    value === "MEDIUM" ||
    value === "HIGH" ||
    value === "VERY_HIGH"
  );
}
