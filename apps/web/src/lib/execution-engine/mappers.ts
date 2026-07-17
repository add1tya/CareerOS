/**
 * Row -> instance mappers (Sprint 6).
 *
 * Central place that converts snake_case database rows into the camelCase
 * INSTANCE types the app uses, so generators and reads stay consistent.
 */
import type {
  MissionInstance,
  QuestInstance,
  TaskInstance,
} from "./types";

// Loose row shapes: Supabase returns untyped rows (no generated DB types yet).
type MissionRow = Record<string, unknown>;
type QuestRow = Record<string, unknown>;
type TaskRow = Record<string, unknown>;

export function toMission(row: MissionRow): MissionInstance {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    generatedFromSkillKey: row.generated_from_skill_key as string,
    generatedFromRecommendationId:
      (row.generated_from_recommendation_id as string | null) ?? null,
    goalId: (row.goal_id as string | null) ?? null,
    title: row.title as string,
    description: row.description as string,
    status: row.status as MissionInstance["status"],
    source: row.source as string,
    templateKey: row.template_key as string,
    templateVersion: row.template_version as number,
    generatedAt: row.generated_at as string,
    createdAt: row.created_at as string,
  };
}

export function toQuest(row: QuestRow): QuestInstance {
  return {
    id: row.id as string,
    missionId: row.mission_id as string,
    title: row.title as string,
    description: row.description as string,
    status: row.status as QuestInstance["status"],
    orderIndex: row.order_index as number,
    completedAt: (row.completed_at as string | null) ?? null,
  };
}

export function toTask(row: TaskRow): TaskInstance {
  return {
    id: row.id as string,
    questId: row.quest_id as string,
    generatedFromSkillKey: row.generated_from_skill_key as string,
    title: row.title as string,
    description: row.description as string,
    estimatedMinutes: row.estimated_minutes as number,
    orderIndex: row.order_index as number,
    status: row.status as TaskInstance["status"],
    completedAt: (row.completed_at as string | null) ?? null,
  };
}
