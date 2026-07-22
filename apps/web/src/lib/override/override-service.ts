/**
 * Override subsystem service (Sprint 12 / M12).
 *
 * Persists append-only Override intent and derives Suppression via the pure
 * policy in suppression.ts. Never writes suppression flags. Never mutates
 * Missions. Never interprets free-text reasons.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  appendHistoryEvent,
  newCorrelationId,
} from "@/lib/history/history-service";
import type { OverrideRecommendationPayload } from "@/lib/override/override-schema";
import { computeSuppressedSkillKeys } from "@/lib/override/suppression";
import {
  OVERRIDE_SCHEMA_VERSION,
  type EvidenceFact,
  type OverrideFact,
  type OverrideRecord,
  type OverrideReasonCode,
} from "@/lib/override/override-types";

/**
 * Loads override + evidence facts and returns the derived suppressed skill set.
 * Fail-loud on query errors.
 */
export async function getSuppressedSkillKeys(
  supabase: SupabaseClient,
  userId: string,
): Promise<ReadonlySet<string>> {
  const [overrides, evidence] = await Promise.all([
    loadRecommendationOverrideFacts(supabase, userId),
    loadEvidenceFacts(supabase, userId),
  ]);
  return computeSuppressedSkillKeys(overrides, evidence);
}

/** All override rows for export / listing (newest first). */
export async function listOverrides(
  supabase: SupabaseClient,
  userId: string,
  limit = 10_000,
): Promise<OverrideRecord[]> {
  const { data, error } = await supabase
    .from("overrides")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load overrides: ${error.message}`);
  }

  return (data ?? []).map(toOverrideRecord);
}

/**
 * Records a recommendation override. Does NOT mutate Missions. Caller should
 * recompute the Decision Engine recommendation afterward.
 */
export async function overrideRecommendation(
  supabase: SupabaseClient,
  userId: string,
  payload: OverrideRecommendationPayload,
): Promise<string> {
  const { data: rec, error: recError } = await supabase
    .from("skill_recommendations")
    .select("id, recommended_skill_key")
    .eq("id", payload.recommendation_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (recError) {
    throw new Error(`Failed to load recommendation: ${recError.message}`);
  }
  if (!rec) {
    throw new Error("Recommendation not found.");
  }

  const skillKey = rec.recommended_skill_key as string;
  const correlationId = newCorrelationId();
  const reasonText = payload.reason_text ?? null;

  const { data: inserted, error: insertError } = await supabase
    .from("overrides")
    .insert({
      user_id: userId,
      kind: "recommendation_overridden",
      skill_key: skillKey,
      recommendation_id: payload.recommendation_id,
      task_id: null,
      reason_code: payload.reason_code,
      reason_text: reasonText,
      override_schema_version: OVERRIDE_SCHEMA_VERSION,
    })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(`Failed to record override: ${insertError.message}`);
  }

  const overrideId = inserted.id as string;

  await appendHistoryEvent(supabase, userId, {
    eventType: "recommendation_overridden",
    entityKind: "override",
    entityId: overrideId,
    correlationId,
    actor: "user",
    payload: {
      skill_key: skillKey,
      reason_code: payload.reason_code,
      recommendation_id: payload.recommendation_id,
    },
  });

  return overrideId;
}

/**
 * Records a task skip override and marks the task skipped. Does not create
 * Evidence. Returns skill_key for History/UI. Quest advancement is handled by
 * the Execution Engine skip helper.
 */
export async function recordTaskSkipOverride(
  supabase: SupabaseClient,
  userId: string,
  params: {
    taskId: string;
    skillKey: string;
    reasonCode: OverrideReasonCode;
    reasonText: string | null;
    correlationId: string;
  },
): Promise<string> {
  const { data: inserted, error: insertError } = await supabase
    .from("overrides")
    .insert({
      user_id: userId,
      kind: "task_skipped",
      skill_key: params.skillKey,
      recommendation_id: null,
      task_id: params.taskId,
      reason_code: params.reasonCode,
      reason_text: params.reasonText,
      override_schema_version: OVERRIDE_SCHEMA_VERSION,
    })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(`Failed to record skip override: ${insertError.message}`);
  }

  const overrideId = inserted.id as string;

  await appendHistoryEvent(supabase, userId, {
    eventType: "task_skipped",
    entityKind: "override",
    entityId: overrideId,
    correlationId: params.correlationId,
    actor: "user",
    payload: {
      skill_key: params.skillKey,
      reason_code: params.reasonCode,
      task_id: params.taskId,
    },
  });

  return overrideId;
}

async function loadRecommendationOverrideFacts(
  supabase: SupabaseClient,
  userId: string,
): Promise<OverrideFact[]> {
  const { data, error } = await supabase
    .from("overrides")
    .select("skill_key, created_at")
    .eq("user_id", userId)
    .eq("kind", "recommendation_overridden");

  if (error) {
    throw new Error(`Failed to load override facts: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    skillKey: row.skill_key as string,
    createdAt: row.created_at as string,
  }));
}

async function loadEvidenceFacts(
  supabase: SupabaseClient,
  userId: string,
): Promise<EvidenceFact[]> {
  const { data, error } = await supabase
    .from("skill_evidence")
    .select("skill_key, recorded_at")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to load evidence facts for suppression: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    skillKey: row.skill_key as string,
    recordedAt: row.recorded_at as string,
  }));
}

function toOverrideRecord(row: Record<string, unknown>): OverrideRecord {
  return {
    id: row.id as string,
    kind: row.kind as OverrideRecord["kind"],
    skillKey: row.skill_key as string,
    recommendationId: (row.recommendation_id as string | null) ?? null,
    taskId: (row.task_id as string | null) ?? null,
    reasonCode: row.reason_code as OverrideReasonCode,
    reasonText: (row.reason_text as string | null) ?? null,
    overrideSchemaVersion: row.override_schema_version as number,
    createdAt: row.created_at as string,
  };
}
