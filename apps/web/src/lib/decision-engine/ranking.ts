/**
 * Ranking engine (Sprint 5 / M5) — PURE and DETERMINISTIC.
 *
 * Pipeline: generate candidates (available skills only) -> lexicographic rank
 * over the ordered factor descriptors -> select winner -> derive deterministic
 * confidence -> build a human-readable reason. No I/O, no clock, no randomness,
 * no weighted sums or invented coefficients.
 */
import type { SkillGraph, SkillGraphNode, SkillStatus } from "@/lib/skill-graph/types";
import {
  RANKING_FACTORS,
  buildRankingContext,
  type RankingContext,
} from "@/lib/decision-engine/factors";
import type {
  RankedCandidate,
  RankingResult,
  RecommendationConfidence,
} from "@/lib/decision-engine/types";

/**
 * Statuses eligible to be recommended: unlocked and not yet mastered. Including
 * in-progress skills (not just `available`) is required once Evidence can move a
 * skill out of `available`: it keeps the recommendation stable on the skill the
 * user is actively working, rather than flipping away the moment they start
 * (Recommendation Stability, task-generation-engine.md §9). A skill leaves the
 * pool only when it becomes `mastered` (or dormant/deprecated), at which point
 * the next-best skill is recommended.
 */
const ACTIVE_CANDIDATE_STATUSES: ReadonlySet<SkillStatus> = new Set([
  "available",
  "learning",
  "practicing",
  "verified",
]);

/** Candidate Generator: unlocked, not-yet-mastered skills. */
export function generateCandidates(graph: SkillGraph): SkillGraphNode[] {
  return graph.nodes.filter((node) => ACTIVE_CANDIDATE_STATUSES.has(node.status));
}

/** Lexicographic comparison across the ordered factors (lower = better). */
function compareByFactors(
  a: SkillGraphNode,
  b: SkillGraphNode,
  ctx: RankingContext,
): number {
  for (const factor of RANKING_FACTORS) {
    const diff = factor.compute(a, ctx) - factor.compute(b, ctx);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** The first factor id at which two candidates diverge, or null if identical. */
function decidingFactorId(
  a: SkillGraphNode,
  b: SkillGraphNode,
  ctx: RankingContext,
): string | null {
  for (const factor of RANKING_FACTORS) {
    if (factor.compute(a, ctx) !== factor.compute(b, ctx)) return factor.id;
  }
  return null;
}

/**
 * Deterministic confidence: how decisively the winner beat the runner-up.
 * Decided on a primary factor => high confidence; decided only by a secondary
 * tie-breaker => low. A sole candidate is unambiguous.
 */
function confidenceFromDecidingFactor(
  decidingId: string | null,
  candidateCount: number,
): RecommendationConfidence {
  if (candidateCount <= 1) return "VERY_HIGH";

  switch (decidingId) {
    case "goal_impact":
      return "VERY_HIGH";
    case "dependency_unlock":
      return "HIGH";
    case "estimated_effort":
      return "MEDIUM";
    default:
      // transferability / stable_order / none => decided by a weak tie-breaker.
      return "LOW";
  }
}

function toRankedCandidate(
  node: SkillGraphNode,
  ctx: RankingContext,
): RankedCandidate {
  return {
    skillKey: node.skill_key,
    name: node.name,
    factors: RANKING_FACTORS.map((factor) => ({
      factorId: factor.id,
      label: factor.label,
      rawValue: factor.compute(node, ctx),
      display: factor.display(node, ctx),
    })),
  };
}

/** Ranking Engine + Winner Selection. */
export function rankCandidates(
  candidates: SkillGraphNode[],
  ctx: RankingContext,
): RankingResult {
  const sorted = [...candidates].sort((a, b) => compareByFactors(a, b, ctx));

  const winnerNode = sorted[0] ?? null;
  const runnerUpNode = sorted[1] ?? null;

  const decidingId =
    winnerNode && runnerUpNode
      ? decidingFactorId(winnerNode, runnerUpNode, ctx)
      : null;

  return {
    ranked: sorted.map((node) => toRankedCandidate(node, ctx)),
    winner: winnerNode ? toRankedCandidate(winnerNode, ctx) : null,
    runnerUp: runnerUpNode ? toRankedCandidate(runnerUpNode, ctx) : null,
    decidingFactorId: decidingId,
    confidence: confidenceFromDecidingFactor(decidingId, sorted.length),
  };
}

/** Reason Generator: deterministic, human-readable "why this skill". */
export function buildReason(
  winner: SkillGraphNode,
  ctx: RankingContext,
  goalTitle: string | null,
): string {
  const goal = goalTitle ? `"${goalTitle}"` : "your goal";
  const unlockCount = ctx.hardChildrenCount.get(winner.skill_key) ?? 0;
  const childNames = ctx.hardChildrenNames.get(winner.skill_key) ?? [];
  const effort = `${winner.estimated_hours_min}\u2013${winner.estimated_hours_max} hours`;

  const base = `${winner.name} is the highest-value skill to learn next. It is a ${winner.ontology_category}-tier skill for ${goal}, and it is available now (all prerequisites met).`;

  if (unlockCount === 0) {
    return `${base} It does not unblock further skills yet, but is a ${winner.ontology_category}-tier priority. Estimated effort: ${effort}.`;
  }

  const preview = childNames.slice(0, 3).join(", ");
  const more = childNames.length > 3 ? ", \u2026" : "";
  return `${base} Mastering it unblocks ${unlockCount} follow-on skill${unlockCount === 1 ? "" : "s"} (${preview}${more}). Estimated effort: ${effort}.`;
}

/** Convenience: full ranking pass over a Skill Graph. */
export function runRanking(graph: SkillGraph): {
  ctx: RankingContext;
  result: RankingResult;
} {
  const ctx = buildRankingContext(graph);
  const result = rankCandidates(generateCandidates(graph), ctx);
  return { ctx, result };
}
