/**
 * Skill Relationship Explorer types + policy v1 (Sprint 21 / M21).
 *
 * Projection over the Skill Graph (ADR-0018). Never modifies graph structure,
 * infers edges, or influences planning/recommendations.
 *
 * Pipeline:
 *   Skill Graph
 *     → Graph Facts
 *       → Relationship Facts
 *         → Relationship View
 *           → UI
 *
 * Roadmap participation is optional enrichment only.
 * SKILL_RELATIONSHIP_EXPLORER_VERSION is independent of Skill Graph schema /
 * Planning / Explainability versions.
 */
import type {
  DependencyType,
  OntologyCategory,
  SkillDomain,
  SkillStatus,
} from "@/lib/skill-graph/types";
import type { RoadmapStepKind } from "@/lib/planning/roadmap-types";

/** Bump when relationship view structure or fact rules change. */
export const SKILL_RELATIONSHIP_EXPLORER_VERSION = 1;

// ---------------------------------------------------------------------------
// Graph Facts (direct projection from Skill Graph storage)
// ---------------------------------------------------------------------------

export type GraphNodeFact = {
  skillKey: string;
  name: string;
  status: SkillStatus;
  mastery: number;
  confidence: number;
  ontologyCategory: OntologyCategory;
  domain: SkillDomain;
};

/** Preserves full edge identity for provenance. */
export type GraphEdgeFact = {
  parentSkillKey: string;
  childSkillKey: string;
  dependencyType: DependencyType;
  minimumMastery: number;
};

export type GraphFacts = {
  focus: GraphNodeFact;
  /** All edges touching the focus skill (1-hop). */
  incidentEdges: GraphEdgeFact[];
  /** Neighbor nodes keyed by skill_key (parents + children + focus). */
  neighborhoodNodes: Record<string, GraphNodeFact>;
};

// ---------------------------------------------------------------------------
// Relationship Facts (composed for presentation; still 1-hop only)
// ---------------------------------------------------------------------------

export type RelatedSkillFact = {
  skillKey: string;
  name: string;
  status: SkillStatus;
  mastery: number;
  confidence: number;
  dependencyType: DependencyType;
  minimumMastery: number;
  /** Direction relative to focus: prerequisite = parent→focus; unlock = focus→child */
  role: "prerequisite" | "unlock";
};

export type RoadmapParticipationFact = {
  onPath: boolean;
  kind: RoadmapStepKind | null;
  whyHere: string | null;
  blockedByNames: string[];
};

export type RelationshipFacts = {
  focus: GraphNodeFact;
  hardPrerequisites: RelatedSkillFact[];
  softPrerequisites: RelatedSkillFact[];
  hardUnlocks: RelatedSkillFact[];
  softUnlocks: RelatedSkillFact[];
  /** Optional — explorer works without this. */
  roadmap: RoadmapParticipationFact | null;
};

// ---------------------------------------------------------------------------
// Relationship View (declarative sections for UI)
// ---------------------------------------------------------------------------

export type SkillRelationshipView = {
  skillRelationshipExplorerVersion: number;
  focusSkillKey: string;
  focusSummary: string;
  hardPrerequisitesSection: string;
  softPrerequisitesSection: string;
  hardUnlocksSection: string;
  softUnlocksSection: string;
  neighborhoodSection: string;
  roadmapSection: string;
  whyHereSection: string;
  /** Structured lists for UI rendering (provenance retained). */
  hardPrerequisites: RelatedSkillFact[];
  softPrerequisites: RelatedSkillFact[];
  hardUnlocks: RelatedSkillFact[];
  softUnlocks: RelatedSkillFact[];
};
