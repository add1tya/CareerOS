/**
 * Decision Engine service (Sprint 5 / M5; explainability Sprint 17 / M17).
 *
 * Wraps the pure ranking engine with persistence: computes the current
 * recommendation deterministically, and appends it to the decision history
 * ONLY when it differs from the latest stored recommendation (write-on-change).
 * Given unchanged inputs this is a no-op, satisfying Recommendation Stability
 * (task-generation-engine.md §9).
 *
 * Decision Explainability is a projection over the immutable persisted
 * `factors` snapshot on the recommendation row — never over today's live
 * ranking for a historical decision (ADR-0014). Ranking logic is unchanged.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { getCareerGraph } from "@/lib/career-graph-service";
import { explainFromPersistedFactors } from "@/lib/decision-engine/decision-explanation";
import {
  buildReason,
  generateCandidates,
  rankCandidates,
} from "@/lib/decision-engine/ranking";
import { buildRankingContext } from "@/lib/decision-engine/factors";
import type {
  DecisionEngineOutput,
  SkillRecommendation,
} from "@/lib/decision-engine/types";
import {
  appendHistoryEvent,
  newCorrelationId,
} from "@/lib/history/history-service";
import { getSuppressedSkillKeys } from "@/lib/override/override-service";
import { excludeSuppressed } from "@/lib/override/suppression";
import { getSkillGraph } from "@/lib/skill-graph/skill-graph-service";

/**
 * Computes the current recommendation and persists it if it changed.
 * Returns recommendation (card), ranking (Decision Inspector), and explanation
 * (founder-facing, from persisted factors).
 *
 * Suppression filters candidate eligibility only — the lexicographic comparator
 * is unchanged (ADR-0009).
 */
export async function getOrCreateCurrentRecommendation(
  supabase: SupabaseClient,
  userId: string,
): Promise<DecisionEngineOutput> {
  const [skillGraph, careerGraph, suppressed] = await Promise.all([
    getSkillGraph(supabase, userId),
    getCareerGraph(supabase, userId),
    getSuppressedSkillKeys(supabase, userId),
  ]);

  const goal = careerGraph.rootGoal;
  const goalTitle = goal?.title ?? null;
  const ctx = buildRankingContext(skillGraph);
  const eligible = excludeSuppressed(generateCandidates(skillGraph), suppressed);
  const result = rankCandidates(eligible, ctx);

  if (!result.winner) {
    return { recommendation: null, ranking: result, explanation: null };
  }

  const winnerNode = skillGraph.nodes.find(
    (node) => node.skill_key === result.winner!.skillKey,
  )!;
  const narrative = buildReason(winnerNode, ctx, goalTitle);

  const { data: latest, error: latestError } = await supabase
    .from("skill_recommendations")
    .select("id, recommended_skill_key, generated_at, factors, narrative, confidence")
    .eq("user_id", userId)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    throw new Error(`Failed to load recommendation history: ${latestError.message}`);
  }

  let recommendationId = latest?.id ?? null;
  let generatedAt = latest?.generated_at ?? null;
  let persistedFactors: unknown = latest?.factors ?? null;
  let persistedNarrative = (latest?.narrative as string | undefined) ?? narrative;
  let persistedConfidence = result.confidence;

  // Write-on-change: only append when the recommended skill differs.
  if (!latest || latest.recommended_skill_key !== result.winner.skillKey) {
    const factorsPayload = serializeFactors(result);
    const { data: inserted, error: insertError } = await supabase
      .from("skill_recommendations")
      .insert({
        user_id: userId,
        recommended_skill_key: result.winner.skillKey,
        goal_id: goal?.id ?? null,
        narrative,
        confidence: result.confidence,
        factors: factorsPayload,
      })
      .select("id, generated_at, factors, narrative, confidence")
      .single();

    if (insertError) {
      throw new Error(`Failed to persist recommendation: ${insertError.message}`);
    }
    recommendationId = inserted.id;
    generatedAt = inserted.generated_at;
    persistedFactors = inserted.factors;
    persistedNarrative = inserted.narrative as string;
    persistedConfidence = result.confidence;

    await appendHistoryEvent(supabase, userId, {
      eventType: "recommendation_recorded",
      entityKind: "skill_recommendation",
      entityId: inserted.id as string,
      correlationId: newCorrelationId(),
      actor: "decision_engine",
      payload: { skill_key: result.winner.skillKey },
    });
  } else if (latest.confidence) {
    persistedConfidence = latest.confidence as typeof result.confidence;
  }

  const recommendation: SkillRecommendation = {
    id: recommendationId!,
    recommendedSkillKey: result.winner.skillKey,
    skillName: result.winner.name,
    narrative: persistedNarrative,
    confidence: persistedConfidence,
    goalId: goal?.id ?? null,
    goalTitle,
    generatedAt,
  };

  // Explainability: authoritative snapshot on the recommendation row only.
  const explanation = explainFromPersistedFactors(persistedFactors, goalTitle);

  return { recommendation, ranking: result, explanation };
}

/**
 * Structured factor breakdown persisted alongside each recommendation, for
 * debugging, evaluation, and Decision Explainability (ADR-0014).
 */
function serializeFactors(result: DecisionEngineOutput["ranking"]) {
  return {
    deciding_factor_id: result.decidingFactorId,
    confidence: result.confidence,
    winner_skill_key: result.winner?.skillKey ?? null,
    candidates: result.ranked.map((candidate, index) => ({
      rank: index + 1,
      skill_key: candidate.skillKey,
      name: candidate.name,
      factors: candidate.factors.map((factor) => ({
        factor_id: factor.factorId,
        raw_value: factor.rawValue,
        display: factor.display,
      })),
    })),
  };
}
