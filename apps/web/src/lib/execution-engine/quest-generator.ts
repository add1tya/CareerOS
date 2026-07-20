/**
 * Quest Generator (Sprint 6).
 *
 * Materializes ONE Quest instance (at a given order_index) plus its Tasks from
 * the template. This is the unit of lazy generation (ADR-0003): the engine
 * calls it for the first quest at mission creation, then again for the next
 * quest only when the active one is completed.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { appendHistoryEvent } from "@/lib/history/history-service";

import { toQuest } from "./mappers";
import { generateTasks } from "./task-generator";
import type { QuestTemplate } from "./templates";
import type { QuestInstance } from "./types";

export async function generateQuest(
  supabase: SupabaseClient,
  params: {
    userId: string;
    missionId: string;
    skillKey: string;
    quest: QuestTemplate;
    orderIndex: number;
    /** Shared with related events from the same action (e.g. mission_created). */
    correlationId: string;
  },
): Promise<QuestInstance> {
  const { userId, missionId, skillKey, quest, orderIndex, correlationId } =
    params;

  const { data, error } = await supabase
    .from("quests")
    .insert({
      user_id: userId,
      mission_id: missionId,
      title: quest.title,
      description: quest.description,
      status: "active",
      order_index: orderIndex,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to generate quest: ${error.message}`);
  }

  const questInstance = toQuest(data);

  await appendHistoryEvent(supabase, userId, {
    eventType: "quest_created",
    entityKind: "quest",
    entityId: questInstance.id,
    correlationId,
    actor: "execution_engine",
    payload: { skill_key: skillKey, order_index: orderIndex },
  });

  await generateTasks(supabase, {
    userId,
    questId: questInstance.id,
    skillKey,
    quest,
  });

  return questInstance;
}
