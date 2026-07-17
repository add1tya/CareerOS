/**
 * Task Generator (Sprint 6).
 *
 * Materializes a Quest's ordered Task instances from its template. Pure
 * translation template -> rows: no scoring, no AI. Called only by the Quest
 * Generator as part of lazy generation.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { toTask } from "./mappers";
import type { QuestTemplate } from "./templates";
import type { TaskInstance } from "./types";

export async function generateTasks(
  supabase: SupabaseClient,
  params: {
    userId: string;
    questId: string;
    skillKey: string;
    quest: QuestTemplate;
  },
): Promise<TaskInstance[]> {
  const { userId, questId, skillKey, quest } = params;

  const rows = quest.tasks.map((task, index) => ({
    user_id: userId,
    quest_id: questId,
    generated_from_skill_key: skillKey,
    title: task.title,
    description: task.description,
    estimated_minutes: task.estimatedMinutes,
    order_index: index,
    status: "pending" as const,
    source: "template",
  }));

  const { data, error } = await supabase
    .from("tasks")
    .insert(rows)
    .select("*");

  if (error) {
    throw new Error(`Failed to generate tasks: ${error.message}`);
  }

  return (data ?? []).map(toTask);
}
