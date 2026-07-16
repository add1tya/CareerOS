/**
 * Ranking factors (Sprint 5 / M5).
 *
 * Each factor is a self-contained descriptor. The Decision Engine ranks purely
 * by iterating this ordered array — adding, removing, or reordering a factor
 * here changes ranking behavior WITHOUT touching the engine's comparison logic
 * (see `ranking.ts`). This is the extension point for future factors
 * (e.g. skill_goal_relevance importance_weight, deadline pressure) so the
 * architecture stays stable as factors evolve.
 *
 * Convention: every factor's `compute` returns a number where LOWER IS BETTER,
 * so ranking is a single ascending lexicographic comparison — no weighted sums,
 * no invented coefficients (only ordinals already defined in the ontology or
 * derived by counting graph edges).
 *
 * Factor order encodes priority. Per task-generation-engine.md §6.2: Goal impact
 * and Dependency unlock value are PRIMARY; the rest are secondary tie-breakers.
 */
import type { SkillDependency, SkillGraph, SkillGraphNode } from "@/lib/skill-graph/types";
import type { OntologyCategory, Transferability } from "@/lib/skill-graph/types";

// Documented sequencing-weight prior (skill-graph-schema.md §2). Lower = higher priority.
const CATEGORY_RANK: Record<OntologyCategory, number> = {
  core: 0,
  advanced: 1,
  specialization: 2,
  future: 3,
};

// Ordinal transferability (skill-graph-schema.md §2). Lower = more transferable.
const TRANSFERABILITY_RANK: Record<Transferability, number> = {
  very_high: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/** Precomputed context shared across factor evaluations for one ranking pass. */
export type RankingContext = {
  /** skill_key -> number of skills that list it as a HARD prerequisite. */
  hardChildrenCount: Map<string, number>;
  /** skill_key -> ordered names of skills it directly hard-unlocks. */
  hardChildrenNames: Map<string, string[]>;
};

export function buildRankingContext(graph: SkillGraph): RankingContext {
  const nameByKey = new Map(graph.nodes.map((n) => [n.skill_key, n.name]));
  const hardChildrenCount = new Map<string, number>();
  const hardChildrenNames = new Map<string, string[]>();

  const hardEdges = graph.edges.filter(
    (edge: SkillDependency) => edge.type === "hard",
  );

  for (const edge of hardEdges) {
    hardChildrenCount.set(
      edge.parent_skill_key,
      (hardChildrenCount.get(edge.parent_skill_key) ?? 0) + 1,
    );
    const names = hardChildrenNames.get(edge.parent_skill_key) ?? [];
    names.push(nameByKey.get(edge.child_skill_key) ?? edge.child_skill_key);
    hardChildrenNames.set(edge.parent_skill_key, names);
  }

  return { hardChildrenCount, hardChildrenNames };
}

export type RankingFactor = {
  id: string;
  label: string;
  /** Comparable value; lower is better. */
  compute: (node: SkillGraphNode, ctx: RankingContext) => number;
  /** Human-readable rendering for the reason text and inspector. */
  display: (node: SkillGraphNode, ctx: RankingContext) => string;
};

/**
 * Ordered, lexicographic ranking factors. Order = priority.
 * To add a factor later, insert a descriptor at the desired priority position.
 */
export const RANKING_FACTORS: RankingFactor[] = [
  {
    id: "goal_impact",
    label: "Goal impact (ontology tier)",
    // Proxy for importance_weight until skill_goal_relevance exists (ADR-0002).
    compute: (node) => CATEGORY_RANK[node.ontology_category],
    display: (node) => node.ontology_category,
  },
  {
    id: "dependency_unlock",
    label: "Dependency unlock value",
    // Negated so more unlocks => lower value => ranked higher.
    compute: (node, ctx) => -(ctx.hardChildrenCount.get(node.skill_key) ?? 0),
    display: (node, ctx) => {
      const count = ctx.hardChildrenCount.get(node.skill_key) ?? 0;
      return `${count} skill${count === 1 ? "" : "s"}`;
    },
  },
  {
    id: "estimated_effort",
    label: "Estimated effort (min hours)",
    compute: (node) => node.estimated_hours_min,
    display: (node) => `${node.estimated_hours_min}\u2013${node.estimated_hours_max}h`,
  },
  {
    id: "transferability",
    label: "Transferability",
    compute: (node) => TRANSFERABILITY_RANK[node.transferability],
    display: (node) => node.transferability,
  },
  {
    id: "stable_order",
    label: "Stable ontology order",
    // Guarantees a total order => deterministic, stable winner.
    compute: (node) => node.display_order,
    display: (node) => String(node.display_order),
  },
];
