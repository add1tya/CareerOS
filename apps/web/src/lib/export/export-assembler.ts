/**
 * Export assembler (Sprint 11 / M11).
 *
 * Loads persisted domain data (+ one labeled computed Roadmap snapshot) into a
 * CareerOsExport document. Fail-loud on any required section load (AR-13).
 * Never invents placeholder domain content (refinement 4).
 *
 * Formatters must NOT call this — they receive an already-assembled document.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { getCareerGraph } from "@/lib/career-graph-service";
import { HISTORY_SCHEMA_VERSION } from "@/lib/history/history-types";
import { listHistoryEvents } from "@/lib/history/history-service";
import { listOverrides } from "@/lib/override/override-service";
import { getRoadmap } from "@/lib/planning/planning-service";
import { PLANNING_ENGINE_VERSION } from "@/lib/planning/roadmap-types";
import { getProfile } from "@/lib/profile-service";
import { listReflections } from "@/lib/reflection/reflection-service";
import { REFLECTION_ENGINE_VERSION } from "@/lib/reflection/reflection-types";
import { MASTERY_POLICY_VERSION } from "@/lib/skill-graph/evidence/mastery-policy";
import { getSkillGraph } from "@/lib/skill-graph/skill-graph-service";

import {
  EXPORT_SCHEMA_VERSION,
  type CareerOsExport,
  type ExportConstraint,
  type ExportEvidenceRow,
  type ExportGoal,
  type ExportMission,
  type ExportProfile,
  type ExportQuest,
  type ExportRecommendation,
  type ExportTask,
} from "@/lib/export/export-types";

/** Upper bound for list reads so a full personal export fits in one response. */
const EXPORT_LIST_LIMIT = 10_000;

/**
 * Assembles a complete CareerOsExport for the user. Throws if profile is missing
 * or any section query fails — never returns a silently partial document.
 */
export async function assembleExport(
  supabase: SupabaseClient,
  userId: string,
): Promise<CareerOsExport> {
  const profile = await getProfile(supabase, userId);
  if (!profile) {
    throw new Error("Cannot export before onboarding.");
  }

  const [
    careerGraph,
    skillGraph,
    recommendations,
    missions,
    quests,
    tasks,
    evidenceRows,
    reflections,
    overrides,
    historyEvents,
    roadmap,
  ] = await Promise.all([
    getCareerGraph(supabase, userId),
    getSkillGraph(supabase, userId),
    loadRecommendations(supabase, userId),
    loadMissions(supabase, userId),
    loadQuests(supabase, userId),
    loadTasks(supabase, userId),
    loadEvidence(supabase, userId),
    listReflections(supabase, userId, EXPORT_LIST_LIMIT),
    listOverrides(supabase, userId, EXPORT_LIST_LIMIT),
    listHistoryEvents(supabase, userId, { limit: EXPORT_LIST_LIMIT }),
    getRoadmap(supabase, userId),
  ]);

  const goals: ExportGoal[] = careerGraph.rootGoal
    ? [
        {
          id: careerGraph.rootGoal.id,
          title: careerGraph.rootGoal.title,
          deadline: careerGraph.rootGoal.deadline,
          status: careerGraph.rootGoal.status,
          source: careerGraph.rootGoal.source,
          parent_goal_id: careerGraph.rootGoal.parent_goal_id,
          created_at: careerGraph.rootGoal.created_at,
          updated_at: careerGraph.rootGoal.updated_at,
        },
      ]
    : [];

  const constraint: ExportConstraint | null = careerGraph.constraint
    ? {
        available_hours_per_week:
          careerGraph.constraint.available_hours_per_week,
        last_confirmed_at: careerGraph.constraint.last_confirmed_at,
        created_at: careerGraph.constraint.created_at,
        updated_at: careerGraph.constraint.updated_at,
      }
    : null;

  const exportProfile: ExportProfile = {
    display_name: profile.display_name,
    current_profession: profile.current_profession,
    target_role: profile.target_role,
    timeline_months: profile.timeline_months,
    available_hours_per_week: profile.available_hours_per_week,
    onboarding_completed_at: profile.onboarding_completed_at,
    career_graph_initialized_at: profile.career_graph_initialized_at,
    skill_graph_generated_at: profile.skill_graph_generated_at,
    created_with_version: profile.created_with_version,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
  };

  return {
    metadata: {
      export_schema_version: EXPORT_SCHEMA_VERSION,
      generated_at: new Date().toISOString(),
      user_id: userId,
      planning_engine_version: PLANNING_ENGINE_VERSION,
      mastery_policy_version: MASTERY_POLICY_VERSION,
      reflection_engine_version: REFLECTION_ENGINE_VERSION,
      history_schema_version: HISTORY_SCHEMA_VERSION,
    },
    profile: exportProfile,
    career_graph: {
      goals,
      constraint,
    },
    skill_graph: {
      nodes: skillGraph.nodes.map((node) => ({
        skill_key: node.skill_key,
        name: node.name,
        description: node.description,
        domain: node.domain,
        ontology_category: node.ontology_category,
        difficulty: node.difficulty,
        estimated_hours_min: node.estimated_hours_min,
        estimated_hours_max: node.estimated_hours_max,
        transferability: node.transferability,
        display_order: node.display_order,
        mastery: node.mastery,
        confidence: node.confidence,
        status: node.status,
        source: node.source,
      })),
      dependencies: skillGraph.edges.map((edge) => ({
        parent_skill_key: edge.parent_skill_key,
        child_skill_key: edge.child_skill_key,
        type: edge.type,
        minimum_mastery: edge.minimum_mastery,
      })),
    },
    execution: {
      recommendations,
      missions,
      quests,
      tasks,
    },
    evidence: {
      records: evidenceRows,
    },
    reflection: {
      reflections,
    },
    overrides: {
      records: overrides,
    },
    history: {
      events: historyEvents,
    },
    computed_snapshots: {
      roadmap: {
        computed: true,
        note: "Point-in-time Roadmap recomputed at export. Not a stored source of truth (AR-01).",
        snapshot: roadmap,
      },
    },
  };
}

async function loadRecommendations(
  supabase: SupabaseClient,
  userId: string,
): Promise<ExportRecommendation[]> {
  const { data, error } = await supabase
    .from("skill_recommendations")
    .select(
      "id, recommended_skill_key, goal_id, narrative, confidence, generated_at",
    )
    .eq("user_id", userId)
    .order("generated_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`Failed to load recommendations for export: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    recommended_skill_key: row.recommended_skill_key as string,
    goal_id: (row.goal_id as string | null) ?? null,
    narrative: row.narrative as string,
    confidence: row.confidence as string,
    generated_at: row.generated_at as string,
  }));
}

async function loadMissions(
  supabase: SupabaseClient,
  userId: string,
): Promise<ExportMission[]> {
  const { data, error } = await supabase
    .from("missions")
    .select("*")
    .eq("user_id", userId)
    .order("generated_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`Failed to load missions for export: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    generated_from_skill_key: row.generated_from_skill_key as string,
    generated_from_recommendation_id:
      (row.generated_from_recommendation_id as string | null) ?? null,
    goal_id: (row.goal_id as string | null) ?? null,
    title: row.title as string,
    description: row.description as string,
    status: row.status as string,
    source: row.source as string,
    template_key: row.template_key as string,
    template_version: row.template_version as number,
    generated_at: row.generated_at as string,
    created_at: row.created_at as string,
  }));
}

async function loadQuests(
  supabase: SupabaseClient,
  userId: string,
): Promise<ExportQuest[]> {
  const { data, error } = await supabase
    .from("quests")
    .select("*")
    .eq("user_id", userId)
    .order("order_index", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`Failed to load quests for export: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    mission_id: row.mission_id as string,
    title: row.title as string,
    description: row.description as string,
    status: row.status as string,
    order_index: row.order_index as number,
    completed_at: (row.completed_at as string | null) ?? null,
  }));
}

async function loadTasks(
  supabase: SupabaseClient,
  userId: string,
): Promise<ExportTask[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .order("order_index", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`Failed to load tasks for export: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    quest_id: row.quest_id as string,
    generated_from_skill_key: row.generated_from_skill_key as string,
    title: row.title as string,
    description: row.description as string,
    estimated_minutes: row.estimated_minutes as number,
    order_index: row.order_index as number,
    status: row.status as string,
    completed_at: (row.completed_at as string | null) ?? null,
    evidence_ref: (row.evidence_ref as string | null) ?? null,
  }));
}

async function loadEvidence(
  supabase: SupabaseClient,
  userId: string,
): Promise<ExportEvidenceRow[]> {
  const { data, error } = await supabase
    .from("skill_evidence")
    .select("*")
    .eq("user_id", userId)
    .order("recorded_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`Failed to load evidence for export: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    skill_key: row.skill_key as string,
    type: row.type as string,
    tier: row.tier as number,
    implied_mastery: Number(row.implied_mastery),
    content_ref: (row.content_ref as string | null) ?? null,
    source: row.source as string,
    generated_from_task_id:
      (row.generated_from_task_id as string | null) ?? null,
    generated_from_reflection_id:
      (row.generated_from_reflection_id as string | null) ?? null,
    mastery_policy_version: row.mastery_policy_version as number,
    recorded_at: row.recorded_at as string,
  }));
}
