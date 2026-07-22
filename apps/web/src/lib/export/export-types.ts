/**
 * Data Export types (Sprint 11 / M11).
 *
 * CareerOsExport is the single assembled document that formatters render.
 * Section order is FIXED (ADR-0008) so Markdown/JSON stay comparable across
 * exports of the same schema version.
 *
 * Within a given EXPORT_SCHEMA_VERSION, field names and structure are stable
 * (refinement 5). Breaking changes require bumping the version.
 */
import type { HistoryEvent } from "@/lib/history/history-types";
import type { OverrideRecord } from "@/lib/override/override-types";
import type { Roadmap } from "@/lib/planning/roadmap-types";
import type { Reflection } from "@/lib/reflection/reflection-types";
import type {
  OntologyCategory,
  SkillDomain,
  SkillStatus,
  Transferability,
  Difficulty,
  DependencyType,
} from "@/lib/skill-graph/types";

/** Bump only when the export document shape changes incompatibly. */
export const EXPORT_SCHEMA_VERSION = 2;

/**
 * Deterministic section order for every export (ADR-0008 / ADR-0009).
 * Formatters MUST emit sections in this sequence.
 */
export const EXPORT_SECTION_ORDER = [
  "metadata",
  "profile",
  "career_graph",
  "skill_graph",
  "execution",
  "evidence",
  "reflection",
  "overrides",
  "history",
  "computed_snapshots",
] as const;

export type ExportSectionId = (typeof EXPORT_SECTION_ORDER)[number];

export type ExportFormat = "markdown" | "json";

/**
 * Self-describing header (refinement 1). Engine/policy versions record which
 * rules were in force when the export was assembled.
 */
export type ExportMetadata = {
  export_schema_version: number;
  generated_at: string;
  user_id: string;
  planning_engine_version: number;
  mastery_policy_version: number;
  reflection_engine_version: number;
  history_schema_version: number;
};

/** Persisted profile fields safe to export (no secrets). */
export type ExportProfile = {
  display_name: string;
  current_profession: string;
  target_role: string;
  timeline_months: number;
  available_hours_per_week: number;
  onboarding_completed_at: string | null;
  career_graph_initialized_at: string | null;
  skill_graph_generated_at: string | null;
  created_with_version: string;
  created_at: string;
  updated_at: string;
};

export type ExportGoal = {
  id: string;
  title: string;
  deadline: string | null;
  status: string;
  source: string;
  parent_goal_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ExportConstraint = {
  available_hours_per_week: number;
  last_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ExportCareerGraph = {
  goals: ExportGoal[];
  constraint: ExportConstraint | null;
};

/** User-relevant skill metadata + overlay (not the full global ontology dump). */
export type ExportSkillNode = {
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
  mastery: number;
  confidence: number;
  status: SkillStatus;
  source: string;
};

export type ExportSkillDependency = {
  parent_skill_key: string;
  child_skill_key: string;
  type: DependencyType;
  minimum_mastery: number;
};

export type ExportSkillGraph = {
  nodes: ExportSkillNode[];
  dependencies: ExportSkillDependency[];
};

export type ExportMission = {
  id: string;
  generated_from_skill_key: string;
  generated_from_recommendation_id: string | null;
  goal_id: string | null;
  title: string;
  description: string;
  status: string;
  source: string;
  template_key: string;
  template_version: number;
  generated_at: string;
  created_at: string;
};

export type ExportQuest = {
  id: string;
  mission_id: string;
  title: string;
  description: string;
  status: string;
  order_index: number;
  completed_at: string | null;
};

export type ExportTask = {
  id: string;
  quest_id: string;
  generated_from_skill_key: string;
  title: string;
  description: string;
  estimated_minutes: number;
  order_index: number;
  status: string;
  completed_at: string | null;
  evidence_ref: string | null;
};

export type ExportRecommendation = {
  id: string;
  recommended_skill_key: string;
  goal_id: string | null;
  narrative: string;
  confidence: string;
  generated_at: string;
};

export type ExportExecution = {
  recommendations: ExportRecommendation[];
  missions: ExportMission[];
  quests: ExportQuest[];
  tasks: ExportTask[];
};

export type ExportEvidenceRow = {
  id: string;
  skill_key: string;
  type: string;
  tier: number;
  implied_mastery: number;
  content_ref: string | null;
  source: string;
  generated_from_task_id: string | null;
  generated_from_reflection_id: string | null;
  mastery_policy_version: number;
  recorded_at: string;
};

export type ExportEvidence = {
  records: ExportEvidenceRow[];
};

export type ExportReflectionSection = {
  reflections: Reflection[];
};

export type ExportHistory = {
  events: HistoryEvent[];
};

export type ExportOverrides = {
  records: OverrideRecord[];
};

/**
 * Computed (not persisted) snapshots. Always labeled — never invent content
 * (refinements 4). Roadmap is AR-01 computed view at export time.
 */
export type ExportComputedSnapshots = {
  roadmap: {
    computed: true;
    note: string;
    snapshot: Roadmap;
  };
};

/**
 * Full export document. Key order in types mirrors EXPORT_SECTION_ORDER.
 * Formatters must not add sections or fabricate empty placeholders beyond
 * honest empty arrays/nulls for missing persisted data.
 */
export type CareerOsExport = {
  metadata: ExportMetadata;
  profile: ExportProfile;
  career_graph: ExportCareerGraph;
  skill_graph: ExportSkillGraph;
  execution: ExportExecution;
  evidence: ExportEvidence;
  reflection: ExportReflectionSection;
  overrides: ExportOverrides;
  history: ExportHistory;
  computed_snapshots: ExportComputedSnapshots;
};
