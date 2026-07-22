/**
 * Pure Skill Relationship Explorer builder (Sprint 21 / M21).
 *
 * Pipeline: Skill Graph → Graph Facts → Relationship Facts → Relationship View.
 * No I/O. 1-hop only. Does not infer edges or call Planning (ADR-0018).
 * Roadmap is optional enrichment.
 */
import {
  SKILL_RELATIONSHIP_EXPLORER_VERSION,
  type GraphEdgeFact,
  type GraphFacts,
  type GraphNodeFact,
  type RelatedSkillFact,
  type RelationshipFacts,
  type RoadmapParticipationFact,
  type SkillRelationshipView,
} from "@/lib/skill-graph/skill-relationship-types";
import type { SkillGraph, SkillGraphNode } from "@/lib/skill-graph/types";
import type { Roadmap } from "@/lib/planning/roadmap-types";

export type BuildSkillRelationshipInput = {
  skillKey: string;
  graph: SkillGraph;
  /** Optional — explorer must work when omitted. */
  roadmap?: Roadmap | null;
};

/**
 * Full projection for one focus skill. Returns null if skillKey is unknown.
 */
export function buildSkillRelationshipView(
  input: BuildSkillRelationshipInput,
): SkillRelationshipView | null {
  const graphFacts = graphFactsForSkill(input.graph, input.skillKey);
  if (!graphFacts) return null;

  const relationshipFacts = relationshipFactsFromGraph(
    graphFacts,
    input.roadmap ?? null,
  );
  return relationshipViewFromFacts(relationshipFacts);
}

export function graphFactsForSkill(
  graph: SkillGraph,
  skillKey: string,
): GraphFacts | null {
  const nodeByKey = new Map(graph.nodes.map((n) => [n.skill_key, n]));
  const focusNode = nodeByKey.get(skillKey);
  if (!focusNode) return null;

  const incidentEdges: GraphEdgeFact[] = [];
  for (const edge of graph.edges) {
    if (
      edge.parent_skill_key === skillKey ||
      edge.child_skill_key === skillKey
    ) {
      incidentEdges.push({
        parentSkillKey: edge.parent_skill_key,
        childSkillKey: edge.child_skill_key,
        dependencyType: edge.type,
        minimumMastery: edge.minimum_mastery,
      });
    }
  }

  const neighborhoodNodes: Record<string, GraphNodeFact> = {
    [skillKey]: toNodeFact(focusNode),
  };
  for (const edge of incidentEdges) {
    for (const key of [edge.parentSkillKey, edge.childSkillKey]) {
      if (neighborhoodNodes[key]) continue;
      const node = nodeByKey.get(key);
      if (node) neighborhoodNodes[key] = toNodeFact(node);
    }
  }

  return {
    focus: toNodeFact(focusNode),
    incidentEdges,
    neighborhoodNodes,
  };
}

export function relationshipFactsFromGraph(
  graphFacts: GraphFacts,
  roadmap: Roadmap | null,
): RelationshipFacts {
  const hardPrerequisites: RelatedSkillFact[] = [];
  const softPrerequisites: RelatedSkillFact[] = [];
  const hardUnlocks: RelatedSkillFact[] = [];
  const softUnlocks: RelatedSkillFact[] = [];

  const focusKey = graphFacts.focus.skillKey;

  for (const edge of graphFacts.incidentEdges) {
    if (edge.childSkillKey === focusKey) {
      // parent → focus = prerequisite
      const parent = graphFacts.neighborhoodNodes[edge.parentSkillKey];
      if (!parent) continue;
      const related = toRelated(parent, edge, "prerequisite");
      if (edge.dependencyType === "hard") hardPrerequisites.push(related);
      else softPrerequisites.push(related);
    } else if (edge.parentSkillKey === focusKey) {
      // focus → child = unlock
      const child = graphFacts.neighborhoodNodes[edge.childSkillKey];
      if (!child) continue;
      const related = toRelated(child, edge, "unlock");
      if (edge.dependencyType === "hard") hardUnlocks.push(related);
      else softUnlocks.push(related);
    }
  }

  sortRelated(hardPrerequisites);
  sortRelated(softPrerequisites);
  sortRelated(hardUnlocks);
  sortRelated(softUnlocks);

  return {
    focus: graphFacts.focus,
    hardPrerequisites,
    softPrerequisites,
    hardUnlocks,
    softUnlocks,
    roadmap: roadmapParticipation(focusKey, roadmap),
  };
}

export function relationshipViewFromFacts(
  facts: RelationshipFacts,
): SkillRelationshipView {
  const f = facts.focus;
  const neighborKeys = new Set<string>([f.skillKey]);
  for (const list of [
    facts.hardPrerequisites,
    facts.softPrerequisites,
    facts.hardUnlocks,
    facts.softUnlocks,
  ]) {
    for (const r of list) neighborKeys.add(r.skillKey);
  }

  return {
    skillRelationshipExplorerVersion: SKILL_RELATIONSHIP_EXPLORER_VERSION,
    focusSkillKey: f.skillKey,
    focusSummary: `${f.name} (${f.skillKey}) — status ${f.status}; mastery ${f.mastery.toFixed(2)}; confidence ${f.confidence.toFixed(2)}; ontology ${f.ontologyCategory}; domain ${f.domain}.`,
    hardPrerequisitesSection: listSection(
      "Hard prerequisites (direct)",
      facts.hardPrerequisites,
    ),
    softPrerequisitesSection: listSection(
      "Soft prerequisites (direct)",
      facts.softPrerequisites,
    ),
    hardUnlocksSection: listSection(
      "Hard unlocks / dependents (direct)",
      facts.hardUnlocks,
    ),
    softUnlocksSection: listSection(
      "Soft unlocks / dependents (direct)",
      facts.softUnlocks,
    ),
    neighborhoodSection: `Immediate neighborhood size: ${neighborKeys.size} skill(s) including focus (1-hop only; no transitive traversal).`,
    roadmapSection: roadmapSectionCopy(facts.roadmap),
    whyHereSection: whyHereCopy(facts),
    hardPrerequisites: facts.hardPrerequisites,
    softPrerequisites: facts.softPrerequisites,
    hardUnlocks: facts.hardUnlocks,
    softUnlocks: facts.softUnlocks,
  };
}

function toNodeFact(node: SkillGraphNode): GraphNodeFact {
  return {
    skillKey: node.skill_key,
    name: node.name,
    status: node.status,
    mastery: node.mastery,
    confidence: node.confidence,
    ontologyCategory: node.ontology_category,
    domain: node.domain,
  };
}

function toRelated(
  node: GraphNodeFact,
  edge: GraphEdgeFact,
  role: "prerequisite" | "unlock",
): RelatedSkillFact {
  return {
    skillKey: node.skillKey,
    name: node.name,
    status: node.status,
    mastery: node.mastery,
    confidence: node.confidence,
    dependencyType: edge.dependencyType,
    minimumMastery: edge.minimumMastery,
    role,
  };
}

function sortRelated(list: RelatedSkillFact[]): void {
  list.sort((a, b) => a.skillKey.localeCompare(b.skillKey));
}

function listSection(title: string, items: RelatedSkillFact[]): string {
  if (items.length === 0) return `${title}: none recorded on the Skill Graph.`;
  const lines = items.map(
    (r) =>
      `${r.name} (${r.skillKey}) — ${r.dependencyType}; min mastery ${r.minimumMastery.toFixed(2)}; status ${r.status}; mastery ${r.mastery.toFixed(2)} / confidence ${r.confidence.toFixed(2)}`,
  );
  return `${title} (${items.length}): ${lines.join("; ")}.`;
}

function roadmapParticipation(
  skillKey: string,
  roadmap: Roadmap | null,
): RoadmapParticipationFact | null {
  if (!roadmap) return null;
  const step = roadmap.steps.find((s) => s.skillKey === skillKey);
  if (!step) {
    return {
      onPath: false,
      kind: null,
      whyHere: null,
      blockedByNames: [],
    };
  }
  return {
    onPath: true,
    kind: step.kind,
    whyHere: step.whyHere,
    blockedByNames: step.blockedBy.map((b) => b.name),
  };
}

function roadmapSectionCopy(roadmap: RoadmapParticipationFact | null): string {
  if (roadmap === null) {
    return "Roadmap context not provided — explorer is Skill Graph–only for this view.";
  }
  if (!roadmap.onPath) {
    return "Not on the current computed Roadmap path (optional context).";
  }
  const blocked =
    roadmap.blockedByNames.length > 0
      ? ` Blocked-by on roadmap step: ${roadmap.blockedByNames.join(", ")}.`
      : "";
  return `On current Roadmap as ${roadmap.kind}. Planner step note: ${roadmap.whyHere ?? "—"}.${blocked}`;
}

function whyHereCopy(facts: RelationshipFacts): string {
  const f = facts.focus;
  const hardReq = facts.hardPrerequisites.length;
  const softReq = facts.softPrerequisites.length;
  const hardOut = facts.hardUnlocks.length;
  const softOut = facts.softUnlocks.length;
  const parts = [
    `Focus status ${f.status} with ${hardReq} hard and ${softReq} soft direct prerequisite edge(s); ${hardOut} hard and ${softOut} soft direct unlock edge(s).`,
    "Placement language below uses only recorded edges and optional Roadmap step fields — no inferred dependencies.",
  ];
  if (facts.roadmap?.onPath && facts.roadmap.whyHere) {
    parts.push(`Roadmap step whyHere: ${facts.roadmap.whyHere}`);
  }
  if (f.status === "locked" && hardReq > 0) {
    parts.push(
      "Hard prerequisites are listed above; soft prerequisites are not treated as hard gates in this view.",
    );
  }
  return parts.join(" ");
}
