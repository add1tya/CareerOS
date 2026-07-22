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
import {
  appendHistoryEvent,
  newCorrelationId,
} from "@/lib/history/history-service";

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

  // One correlation id for mission_created + quest_created from this action.
  const correlationId = newCorrelationId();

  const mission = await generateMission(supabase, {
    userId,
    template,
    recommendationId: recommendation.id,
    goalId: recommendation.goalId,
    correlationId,
  });

  // Lazy generation: only the first quest (+ its tasks) up front.
  await generateQuest(supabase, {
    userId,
    missionId: mission.id,
    skillKey: template.skillKey,
    quest: template.quests[0],
    orderIndex: 0,
    correlationId,
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
 * Signal emitted when a Task transitions to completed. This is the ONLY thing
 * the Execution Engine exposes about completion; all learning logic (Evidence,
 * Mastery, Confidence, status) lives in the Evidence subsystem, which consumes
 * this signal. The Execution Engine has no dependency on that subsystem.
 */
export type TaskCompletionSignal = {
  taskId: string;
  skillKey: string;
  /** Shared with Evidence History events from the same user action. */
  correlationId: string;
};

/**
 * Completes a Task and applies the deterministic EXECUTION consequences: when
 * every Task in the active Quest is done, complete the Quest and lazily generate
 * the next one (or complete the Mission if none remains). Returns a completion
 * signal for the caller to forward to the Evidence subsystem, or null if no Task
 * was completed. No Evidence/Mastery logic happens here.
 *
 * @param correlationId - optional; when provided (typical from the dashboard
 *   action), groups task/quest/mission History events with the subsequent
 *   evidence_recorded event. Generated internally if omitted.
 */
export async function completeTaskAndAdvance(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
  correlationId: string = newCorrelationId(),
): Promise<TaskCompletionSignal | null> {
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
    // Not found / not owned — nothing to complete.
    return null;
  }

  const completedTask = toTask(taskRow);
  // The Task is completed; the signal is returned regardless of whether the
  // Quest/Mission also advances below.
  const signal: TaskCompletionSignal = {
    taskId: completedTask.id,
    skillKey: completedTask.generatedFromSkillKey,
    correlationId,
  };

  await appendHistoryEvent(supabase, userId, {
    eventType: "task_completed",
    entityKind: "task",
    entityId: completedTask.id,
    correlationId,
    actor: "user",
    payload: { skill_key: completedTask.generatedFromSkillKey },
  });

  const questId = completedTask.questId;

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
    return signal;
  }

  const tasks = await loadTasks(supabase, questId);
  const allResolved = tasks.every(isTaskResolved);
  if (!allResolved) {
    return signal;
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
    return signal;
  }

  await appendHistoryEvent(supabase, userId, {
    eventType: "quest_completed",
    entityKind: "quest",
    entityId: questId,
    correlationId,
    actor: "execution_engine",
    payload: { skill_key: completedTask.generatedFromSkillKey },
  });

  await advanceMission(supabase, userId, quest.missionId, correlationId);
  return signal;
}

export type TaskSkipSignal = {
  taskId: string;
  skillKey: string;
  correlationId: string;
};

/**
 * Skips a Task (no Evidence). When every Task in the active Quest is completed
 * or skipped, advances Quest/Mission the same way completion does. Missions are
 * never rewritten by recommendation overrides — only task/quest status here.
 */
export async function skipTaskAndAdvance(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
  correlationId: string = newCorrelationId(),
): Promise<TaskSkipSignal | null> {
  const { data: taskRow, error: taskError } = await supabase
    .from("tasks")
    .update({ status: "skipped", completed_at: null })
    .eq("id", taskId)
    .eq("user_id", userId)
    .in("status", ["pending", "active"])
    .select("*")
    .maybeSingle();

  if (taskError) {
    throw new Error(`Failed to skip task: ${taskError.message}`);
  }
  if (!taskRow) {
    return null;
  }

  const skippedTask = toTask(taskRow);
  const signal: TaskSkipSignal = {
    taskId: skippedTask.id,
    skillKey: skippedTask.generatedFromSkillKey,
    correlationId,
  };

  // History for the skip itself is recorded by the Override subsystem
  // (task_skipped on the override entity). Quest/mission advancement events
  // still come from Execution when the quest resolves.

  const questId = skippedTask.questId;

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
  if (quest.status !== "active") {
    return signal;
  }

  const tasks = await loadTasks(supabase, questId);
  const allResolved = tasks.every(isTaskResolved);
  if (!allResolved) {
    return signal;
  }

  const { data: completedQuest, error: completeError } = await supabase
    .from("quests")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", questId)
    .eq("user_id", userId)
    .eq("status", "active")
    .select("id")
    .maybeSingle();

  if (completeError) {
    throw new Error(`Failed to complete quest after skip: ${completeError.message}`);
  }
  if (!completedQuest) {
    return signal;
  }

  await appendHistoryEvent(supabase, userId, {
    eventType: "quest_completed",
    entityKind: "quest",
    entityId: questId,
    correlationId,
    actor: "execution_engine",
    payload: { skill_key: skippedTask.generatedFromSkillKey },
  });

  await advanceMission(supabase, userId, quest.missionId, correlationId);
  return signal;
}

/** Completed or skipped counts as resolved for quest advancement. */
function isTaskResolved(task: TaskInstance): boolean {
  return task.status === "completed" || task.status === "skipped";
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
  correlationId: string,
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
      correlationId,
    });
    return;
  }

  await completeMission(supabase, userId, missionId, correlationId);
}

async function completeMission(
  supabase: SupabaseClient,
  userId: string,
  missionId: string,
  correlationId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("missions")
    .update({ status: "completed" })
    .eq("id", missionId)
    .eq("user_id", userId)
    .eq("status", "active")
    .select("id, generated_from_skill_key")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to complete mission: ${error.message}`);
  }
  if (!data) return;

  await appendHistoryEvent(supabase, userId, {
    eventType: "mission_completed",
    entityKind: "mission",
    entityId: missionId,
    correlationId,
    actor: "execution_engine",
    payload: {
      skill_key: (data.generated_from_skill_key as string) ?? null,
    },
  });
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
