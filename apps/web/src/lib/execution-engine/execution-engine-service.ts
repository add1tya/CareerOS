/**
 * Execution Engine service (Sprint 6) — orchestration + persistence.
 *
 * Ties the pure pieces (templates, generators, session planner) to Supabase and
 * enforces the Sprint 6 refinements (ADR-0003):
 *
 *  - Lazy generation: a Mission is created with only its first Quest + Tasks.
 *    The next Quest materializes only when the active Quest's tasks are all done.
 *  - Provenance: each Mission records the Recommendation, skill, template, and
 *    version it came from.
 *  - Immutability: a Mission is frozen at its template_version. If the authored
 *    template is later revised (version bump), that Mission is NOT extended with
 *    quests from a different version — it simply completes what it has.
 *  - Idempotency: generation keys off the recommendation id, so re-rendering the
 *    dashboard never creates duplicate Missions.
 *
 * Deterministic throughout. No Claude, no evidence, no mastery/XP/streaks.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { SkillRecommendation } from "@/lib/decision-engine/types";

import { toMission, toQuest, toTask } from "./mappers";
import { generateMission } from "./mission-generator";
import { generateQuest } from "./quest-generator";
import { planSession } from "./session-planner";
import { getExecutionTemplate, type SkillExecutionTemplate } from "./templates";
import type {
  ExecutionPlan,
  MissionInstance,
  QuestInstance,
  TaskInstance,
} from "./types";

export type ExecutionPlanResult =
  | { status: "none" }
  | { status: "unsupported"; skillKey: string; skillName: string }
  | { status: "ready"; plan: ExecutionPlan };

/**
 * Entry point for the dashboard: ensures the Mission (and its first Quest) for
 * the current recommendation exists, then returns the assembled plan.
 */
export async function getOrCreateExecutionPlan(
  supabase: SupabaseClient,
  userId: string,
  recommendation: SkillRecommendation | null,
): Promise<ExecutionPlanResult> {
  if (!recommendation) {
    return { status: "none" };
  }

  const template = getExecutionTemplate(recommendation.recommendedSkillKey);
  if (!template) {
    // Honest empty state: no authored template — we do not fabricate tasks.
    return {
      status: "unsupported",
      skillKey: recommendation.recommendedSkillKey,
      skillName: recommendation.skillName,
    };
  }

  const mission = await ensureMission(supabase, userId, recommendation, template);
  const plan = await assemblePlan(supabase, mission, template);
  return { status: "ready", plan };
}

/**
 * Finds the Mission for this recommendation, or creates it (with its first
 * Quest + Tasks). Idempotent on the recommendation id.
 */
async function ensureMission(
  supabase: SupabaseClient,
  userId: string,
  recommendation: SkillRecommendation,
  template: SkillExecutionTemplate,
): Promise<MissionInstance> {
  const { data: existing, error: findError } = await supabase
    .from("missions")
    .select("*")
    .eq("user_id", userId)
    .eq("generated_from_recommendation_id", recommendation.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) {
    throw new Error(`Failed to load mission: ${findError.message}`);
  }

  if (existing) {
    return toMission(existing);
  }

  const mission = await generateMission(supabase, {
    userId,
    template,
    recommendationId: recommendation.id,
    goalId: recommendation.goalId,
  });

  // Lazy generation: only the first quest (+ its tasks) up front.
  await generateQuest(supabase, {
    userId,
    missionId: mission.id,
    skillKey: template.skillKey,
    quest: template.quests[0],
    orderIndex: 0,
  });

  return mission;
}

/** Loads the mission's quests + active quest tasks into a render-ready plan. */
async function assemblePlan(
  supabase: SupabaseClient,
  mission: MissionInstance,
  template: SkillExecutionTemplate,
): Promise<ExecutionPlan> {
  const quests = await loadQuests(supabase, mission.id);
  const activeQuest = quests.find((quest) => quest.status === "active") ?? null;

  let todaysTasks: TaskInstance[] = [];
  let questProgress = { completedTasks: 0, totalTasks: 0 };

  if (activeQuest) {
    const tasks = await loadTasks(supabase, activeQuest.id);
    todaysTasks = planSession(tasks);
    questProgress = {
      completedTasks: tasks.filter((task) => task.status === "completed").length,
      totalTasks: tasks.length,
    };
  }

  const missionCompleted = mission.status === "completed";
  const completedQuests = quests.filter((q) => q.status === "completed").length;
  const questPosition = {
    index: activeQuest ? activeQuest.orderIndex + 1 : completedQuests,
    total: template.quests.length,
  };

  return {
    mission,
    activeQuest,
    todaysTasks,
    questProgress,
    questPosition,
    missionCompleted,
  };
}

/**
 * Completes a Task and applies the deterministic downstream consequences:
 * when every Task in the active Quest is done, complete the Quest and lazily
 * generate the next one (or complete the Mission if none remains). The user's
 * only action is completing a task; Quest/Mission transitions are automatic.
 */
export async function completeTaskAndAdvance(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
): Promise<void> {
  const { data: taskRow, error: taskError } = await supabase
    .from("tasks")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();

  if (taskError) {
    throw new Error(`Failed to complete task: ${taskError.message}`);
  }
  if (!taskRow) {
    // Not found / not owned — nothing to advance.
    return;
  }

  const questId = toTask(taskRow).questId;

  const { data: questRow, error: questError } = await supabase
    .from("quests")
    .select("*")
    .eq("id", questId)
    .eq("user_id", userId)
    .single();

  if (questError) {
    throw new Error(`Failed to load quest: ${questError.message}`);
  }

  const quest = toQuest(questRow);
  // Guard against double-submit: only an active quest can advance.
  if (quest.status !== "active") {
    return;
  }

  const tasks = await loadTasks(supabase, questId);
  const allDone = tasks.every((task) => task.status === "completed");
  if (!allDone) {
    return;
  }

  // Complete the quest (conditional on still-active to stay idempotent).
  const { data: completedQuest, error: completeError } = await supabase
    .from("quests")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", questId)
    .eq("user_id", userId)
    .eq("status", "active")
    .select("id")
    .maybeSingle();

  if (completeError) {
    throw new Error(`Failed to complete quest: ${completeError.message}`);
  }
  // Another concurrent request already advanced this quest.
  if (!completedQuest) {
    return;
  }

  await advanceMission(supabase, userId, quest.missionId);
}

/**
 * Lazily generates the next Quest for a Mission, or completes the Mission when
 * no further Quest can be produced. Honors template immutability: a Mission is
 * only extended from the exact template_version it was generated at.
 */
async function advanceMission(
  supabase: SupabaseClient,
  userId: string,
  missionId: string,
): Promise<void> {
  const { data: missionRow, error: missionError } = await supabase
    .from("missions")
    .select("*")
    .eq("id", missionId)
    .eq("user_id", userId)
    .single();

  if (missionError) {
    throw new Error(`Failed to load mission: ${missionError.message}`);
  }

  const mission = toMission(missionRow);
  const template = getExecutionTemplate(mission.generatedFromSkillKey);

  // Immutability: never extend a mission using a different template version than
  // the one it was frozen at. If the authored template has since been revised
  // (or removed), the mission completes with the quests it already has.
  const versionMatches =
    template !== null && template.templateVersion === mission.templateVersion;

  const existingQuests = await loadQuests(supabase, missionId);
  const nextIndex = existingQuests.length;

  if (versionMatches && nextIndex < template.quests.length) {
    await generateQuest(supabase, {
      userId,
      missionId,
      skillKey: mission.generatedFromSkillKey,
      quest: template.quests[nextIndex],
      orderIndex: nextIndex,
    });
    return;
  }

  await completeMission(supabase, userId, missionId);
}

async function completeMission(
  supabase: SupabaseClient,
  userId: string,
  missionId: string,
): Promise<void> {
  const { error } = await supabase
    .from("missions")
    .update({ status: "completed" })
    .eq("id", missionId)
    .eq("user_id", userId)
    .eq("status", "active");

  if (error) {
    throw new Error(`Failed to complete mission: ${error.message}`);
  }
}

async function loadQuests(
  supabase: SupabaseClient,
  missionId: string,
): Promise<QuestInstance[]> {
  const { data, error } = await supabase
    .from("quests")
    .select("*")
    .eq("mission_id", missionId)
    .order("order_index", { ascending: true });

  if (error) {
    throw new Error(`Failed to load quests: ${error.message}`);
  }
  return (data ?? []).map(toQuest);
}

async function loadTasks(
  supabase: SupabaseClient,
  questId: string,
): Promise<TaskInstance[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("quest_id", questId)
    .order("order_index", { ascending: true });

  if (error) {
    throw new Error(`Failed to load tasks: ${error.message}`);
  }
  return (data ?? []).map(toTask);
}
