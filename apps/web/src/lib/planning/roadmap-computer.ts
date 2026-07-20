/**
 * Planning Engine — Roadmap computation (Sprint 9 / M9). PURE and DETERMINISTIC.
 *
 * Computes the Roadmap: the ordered path of skills from the user's present Skill
 * Graph state toward their Goal. This is the "route" the routing engine follows;
 * it is COMPUTED, never persisted (AR-01, career-graph-schema.md §3.9).
 *
 * Algorithm — greedy topological ordering that GENERALIZES the Decision Engine:
 *   1. Mastered skills are `completed` and listed first (context only).
 *   2. For the remaining skills, repeatedly select — among those whose HARD
 *      prerequisites are already satisfied (in current state or by an
 *      earlier-placed step) — the best by the EXACT Decision Engine comparator
 *      (`compareByFactors`), append it, and treat it as achieved for its
 *      dependents. Repeat until the path is complete.
 *
 * Because step 2 reuses the same comparator over the same initially-eligible
 * pool, the first placed skill is identical to the Decision Engine winner — the
 * current Recommendation is, by construction, the head of the Roadmap.
 *
 * Invariants (see ADR-0006):
 *   - Completed skills always appear first.
 *   - The current skill always follows the completed skills.
 *   - Upcoming skills always satisfy prerequisite ordering.
 *   - No skill appears twice.
 *   - The first upcoming (current) step equals the current Recommendation.
 *
 * Determinism: no I/O, no clock, no randomness. Effort/ETA are computed for
 * presentation only and NEVER influence ordering.
 */
import { buildReason, compareByFactors } from "@/lib/decision-engine/ranking";
import { buildRankingContext } from "@/lib/decision-engine/factors";
import type {
  SkillDependency,
  SkillGraph,
  SkillGraphNode,
  SkillStatus,
} from "@/lib/skill-graph/types";

import {
  PLANNING_ENGINE_VERSION,
  type BlockedBy,
  type Roadmap,
  type RoadmapStep,
} from "@/lib/planning/roadmap-types";

/** Skills considered already achieved — shown first, excluded from the path. */
const COMPLETED_STATUSES: ReadonlySet<SkillStatus> = new Set(["mastered"]);

/** Skills excluded from the forward path entirely (not part of the route). */
const EXCLUDED_STATUSES: ReadonlySet<SkillStatus> = new Set([
  "dormant",
  "deprecated",
]);

/** Does the parent already meet this hard edge's threshold in the CURRENT state? */
function edgeSatisfiedNow(
  edge: SkillDependency,
  nodeByKey: Map<string, SkillGraphNode>,
): boolean {
  const parent = nodeByKey.get(edge.parent_skill_key);
  if (!parent) return true; // unknown parent cannot block (fail open, deterministic)
  return parent.mastery >= edge.minimum_mastery;
}

export function computeRoadmap(
  graph: SkillGraph,
  goalTitle: string | null,
): Roadmap {
  const ctx = buildRankingContext(graph);
  const nodeByKey = new Map(graph.nodes.map((n) => [n.skill_key, n]));

  // child_skill_key -> its HARD prerequisite edges.
  const hardParents = new Map<string, SkillDependency[]>();
  for (const edge of graph.edges) {
    if (edge.type !== "hard") continue;
    const list = hardParents.get(edge.child_skill_key) ?? [];
    list.push(edge);
    hardParents.set(edge.child_skill_key, list);
  }

  const completed = graph.nodes
    .filter((n) => COMPLETED_STATUSES.has(n.status))
    .sort((a, b) => a.display_order - b.display_order);

  // Forward path pool: everything not already completed and not excluded.
  const pool = graph.nodes.filter(
    (n) => !COMPLETED_STATUSES.has(n.status) && !EXCLUDED_STATUSES.has(n.status),
  );

  // Greedy topological ordering using the Decision Engine comparator.
  const placedKeys = new Set<string>();
  const ordered: SkillGraphNode[] = [];
  const remaining = [...pool];

  const parentsSatisfied = (skill: SkillGraphNode): boolean => {
    const edges = hardParents.get(skill.skill_key) ?? [];
    return edges.every(
      (edge) =>
        placedKeys.has(edge.parent_skill_key) ||
        edgeSatisfiedNow(edge, nodeByKey),
    );
  };

  while (remaining.length > 0) {
    let eligible = remaining.filter(parentsSatisfied);
    // Fallback: if nothing is eligible (cycle, or prereqs on excluded skills),
    // consider all remaining so ordering stays total and terminates.
    if (eligible.length === 0) eligible = remaining;

    eligible.sort((a, b) => compareByFactors(a, b, ctx));
    const next = eligible[0];

    ordered.push(next);
    placedKeys.add(next.skill_key);
    remaining.splice(
      remaining.findIndex((n) => n.skill_key === next.skill_key),
      1,
    );
  }

  const currentNode = ordered[0] ?? null;

  const buildBlockedBy = (skill: SkillGraphNode): BlockedBy[] => {
    const edges = hardParents.get(skill.skill_key) ?? [];
    return edges
      .filter((edge) => !edgeSatisfiedNow(edge, nodeByKey))
      .map((edge) => {
        const parent = nodeByKey.get(edge.parent_skill_key);
        return {
          skillKey: edge.parent_skill_key,
          name: parent?.name ?? edge.parent_skill_key,
          minimumMastery: edge.minimum_mastery,
          currentMastery: parent?.mastery ?? 0,
        };
      });
  };

  const whyHereForPath = (skill: SkillGraphNode, isCurrent: boolean): string => {
    if (isCurrent) {
      // Ties the head of the Roadmap to the Decision Engine's own explanation.
      return buildReason(skill, ctx, goalTitle);
    }
    const blocking = buildBlockedBy(skill);
    const unlocks = ctx.hardChildrenCount.get(skill.skill_key) ?? 0;
    const tier = `${skill.ontology_category}-tier`;
    if (blocking.length > 0) {
      const names = blocking.map((b) => b.name).slice(0, 3).join(", ");
      const more = blocking.length > 3 ? ", \u2026" : "";
      return `Becomes available after ${names}${more} (${tier} priority${
        unlocks > 0 ? `, unlocks ${unlocks} more` : ""
      }).`;
    }
    return `Prerequisites already met; sequenced by ${tier} priority${
      unlocks > 0 ? ` and its ${unlocks}-skill unlock value` : ""
    }.`;
  };

  const steps: RoadmapStep[] = [];
  let order = 0;

  for (const node of completed) {
    steps.push({
      stepId: node.skill_key,
      skillKey: node.skill_key,
      name: node.name,
      ontologyCategory: node.ontology_category,
      kind: "completed",
      status: node.status,
      mastery: node.mastery,
      confidence: node.confidence,
      order: order++,
      whyHere: "Already mastered.",
      blockedBy: [],
      effort: {
        hoursMin: node.estimated_hours_min,
        hoursMax: node.estimated_hours_max,
        cumulativeHoursMin: 0,
        cumulativeHoursMax: 0,
      },
    });
  }

  let cumulativeMin = 0;
  let cumulativeMax = 0;

  ordered.forEach((node, index) => {
    const isCurrent = index === 0;
    cumulativeMin += node.estimated_hours_min;
    cumulativeMax += node.estimated_hours_max;

    steps.push({
      stepId: node.skill_key,
      skillKey: node.skill_key,
      name: node.name,
      ontologyCategory: node.ontology_category,
      kind: isCurrent ? "current" : "upcoming",
      status: node.status,
      mastery: node.mastery,
      confidence: node.confidence,
      order: order++,
      whyHere: whyHereForPath(node, isCurrent),
      blockedBy: buildBlockedBy(node),
      effort: {
        hoursMin: node.estimated_hours_min,
        hoursMax: node.estimated_hours_max,
        cumulativeHoursMin: cumulativeMin,
        cumulativeHoursMax: cumulativeMax,
      },
    });
  });

  return {
    planningEngineVersion: PLANNING_ENGINE_VERSION,
    goalTitle,
    steps,
    currentStepId: currentNode?.skill_key ?? null,
    remainingHoursMin: cumulativeMin,
    remainingHoursMax: cumulativeMax,
  };
}
