/**
 * Decision Engine service (Sprint 5 / M5).
 *
 * Wraps the pure ranking engine with persistence: computes the current
 * recommendation deterministically, and appends it to the decision history
 * ONLY when it differs from the latest stored recommendation (write-on-change).
 * Given unchanged inputs this is a no-op, satisfying Recommendation Stability
 * (task-generation-engine.md §9).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { getCareerGraph } from "@/lib/career-graph-service";
import { buildReason, runRanking } from "@/lib/decision-engine/ranking";
import type {
  DecisionEngineOutput,
  SkillRecommendation,
} from "@/lib/decision-engine/types";
import { getSkillGraph } from "@/lib/skill-graph/skill-graph-service";

/**
 * Computes the current recommendation and persists it if it changed.
 * Returns both the recommendation (for the card) and the full ranking
 * (for the Decision Engine Inspector).
 */
export async function getOrCreateCurrentRecommendation(
  supabase: SupabaseClient,
  userId: string,
): Promise<DecisionEngineOutput> {
  const [skillGraph, careerGraph] = await Promise.all([
    getSkillGraph(supabase, userId),
    getCareerGraph(supabase, userId),
  ]);

  const goal = careerGraph.rootGoal;
  const { ctx, result } = runRanking(skillGraph);

  // Honest empty state: nothing available to recommend (all locked/mastered).
  if (!result.winner) {
    return { recommendation: null, ranking: result };
  }

  const winnerNode = skillGraph.nodes.find(
    (node) => node.skill_key === result.winner!.skillKey,
  )!;
  const narrative = buildReason(winnerNode, ctx, goal?.title ?? null);

  const { data: latest, error: latestError } = await supabase
    .from("skill_recommendations")
    .select("id, recommended_skill_key, generated_at")
    .eq("user_id", userId)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    throw new Error(`Failed to load recommendation history: ${latestError.message}`);
  }

  let recommendationId = latest?.id ?? null;
  let generatedAt = latest?.generated_at ?? null;

  // Write-on-change: only append when the recommended skill differs.
  if (!latest || latest.recommended_skill_key !== result.winner.skillKey) {
    const { data: inserted, error: insertError } = await supabase
      .from("skill_recommendations")
      .insert({
        user_id: userId,
        recommended_skill_key: result.winner.skillKey,
        goal_id: goal?.id ?? null,
        narrative,
        confidence: result.confidence,
        factors: serializeFactors(result),
      })
      .select("id, generated_at")
      .single();

    if (insertError) {
      throw new Error(`Failed to persist recommendation: ${insertError.message}`);
    }
    recommendationId = inserted.id;
    generatedAt = inserted.generated_at;
  }

  const recommendation: SkillRecommendation = {
    id: recommendationId!,
    recommendedSkillKey: result.winner.skillKey,
    skillName: result.winner.name,
    narrative,
    confidence: result.confidence,
    goalId: goal?.id ?? null,
    goalTitle: goal?.title ?? null,
    generatedAt,
  };

  return { recommendation, ranking: result };
}

/**
 * Structured factor breakdown persisted alongside each recommendation, for
 * debugging and future evaluation: the winner, the deciding factor, and every
 * candidate with its per-factor values.
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
