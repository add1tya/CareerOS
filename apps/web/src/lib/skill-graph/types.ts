/**
 * Skill Graph types (Sprint 4 / M4).
 *
 * Separation preserved throughout:
 *   - `Skill` / `SkillDependency`  -> GLOBAL ontology (required capabilities)
 *   - `UserSkillMastery`           -> PER-USER overlay (current mastery)
 * The assembled `SkillGraph` joins them for read-only display, never merging
 * the two into a single stored record.
 */

export const SKILL_DOMAINS = [
  "programming_systems",
  "cs_theory",
  "data_backend_infra",
  "math",
  "core_ml_dl",
  "llm_genai_systems",
  "evaluation_training_production",
  "software_systems_engineering",
  "meta_skills",
] as const;
export type SkillDomain = (typeof SKILL_DOMAINS)[number];

export type OntologyCategory = "core" | "advanced" | "specialization" | "future";
export type Difficulty = "low" | "medium" | "high" | "very_high";
export type Transferability = "low" | "medium" | "high" | "very_high";
export type DependencyType = "hard" | "soft";

// Full reserved set; Sprint 4 only writes `locked` / `available`.
export type SkillStatus =
  | "locked"
  | "available"
  | "learning"
  | "practicing"
  | "verified"
  | "mastered"
  | "dormant"
  | "deprecated";

export type MasterySource = "system" | "domain_advantage";

/** GLOBAL ontology row — user-agnostic required capability. */
export type Skill = {
  skill_key: string;
  name: string;
  description: string;
  domain: SkillDomain;
  ontology_category: OntologyCategory;
  difficulty: Difficulty;
  estimated_hours_min: number;
  estimated_hours_max: number;
  transferability: Transferability;
  display_order: number;
  ontology_version: string;
};

/** GLOBAL ontology edge — prerequisite relationship. */
export type SkillDependency = {
  parent_skill_key: string;
  child_skill_key: string;
  type: DependencyType;
  minimum_mastery: number;
};

/** PER-USER overlay row. */
export type UserSkillMastery = {
  skill_key: string;
  mastery: number;
  confidence: number;
  status: SkillStatus;
  source: MasterySource;
};

/** A skill joined with the current user's overlay, for read-only rendering. */
export type SkillGraphNode = Skill & {
  mastery: number;
  confidence: number;
  status: SkillStatus;
  source: MasterySource;
};

export type SkillGraph = {
  nodes: SkillGraphNode[];
  edges: SkillDependency[];
};
