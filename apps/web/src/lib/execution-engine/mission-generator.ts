/**
 * Mission Generator (Sprint 6).
 *
 * Creates a Mission instance from a Recommendation + skill template, recording
 * full provenance (ADR-0003): the recommendation it came from, the skill, the
 * template key, and the exact template version — so the Mission is frozen at
 * that version and remains fully explainable.
 *
 * It generates ONLY the Mission row here. The first Quest (and its Tasks) is
 * materialized by the orchestrator immediately after, keeping generation lazy.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { appendHistoryEvent } from "@/lib/history/history-service";

import { toMission } from "./mappers";
import type { SkillExecutionTemplate } from "./templates";
import type { MissionInstance } from "./types";

export async function generateMission(
  supabase: SupabaseClient,
  params: {
    userId: string;
    template: SkillExecutionTemplate;
    recommendationId: string | null;
    goalId: string | null;
    /** Shared with related events from the same action (e.g. first quest). */
    correlationId: string;
  },
): Promise<MissionInstance> {
  const { userId, template, recommendationId, goalId, correlationId } = params;

  const { data, error } = await supabase
    .from("missions")
    .insert({
      user_id: userId,
      generated_from_skill_key: template.skillKey,
      generated_from_recommendation_id: recommendationId,
      goal_id: goalId,
      title: template.mission.title,
      description: template.mission.description,
      status: "active",
      source: "template",
      template_key: template.skillKey,
      template_version: template.templateVersion,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to generate mission: ${error.message}`);
  }

  await appendHistoryEvent(supabase, userId, {
    eventType: "mission_created",
    entityKind: "mission",
    entityId: data.id as string,
    correlationId,
    actor: "execution_engine",
    payload: { skill_key: template.skillKey },
  });

  return toMission(data);
}
