/**
 * Reflection subsystem service (Sprint 8) — orchestration + persistence.
 *
 * Owns the `reflections` table and its lifecycle; it does NOT write Evidence or
 * the overlay directly. On confirmation it delegates to the Evidence subsystem
 * (the sole writer of Evidence/overlay), keeping subsystem boundaries clean.
 *
 * Lifecycle (deterministic, fail-loud):
 *   create  -> insert an immutable reflection with engine-derived proposals
 *              (status 'proposed'), snapshotting engine/policy versions and the
 *              evaluated skill state.
 *   confirm -> append Reflection Evidence for each proposal, then flip status to
 *              'confirmed' (one-way; DB-enforced immutability afterward).
 *   decline -> flip status to 'declined' (preserved as signal; no Evidence).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  appendHistoryEvent,
  newCorrelationId,
} from "@/lib/history/history-service";
import { recordReflectionEvidence } from "@/lib/skill-graph/evidence/evidence-service";
import { MASTERY_POLICY_VERSION } from "@/lib/skill-graph/evidence/mastery-policy";

import { deriveUpdates } from "./reflection-engine";
import type { CreateReflectionPayload } from "./reflection-schema";
import {
  REFLECTION_ENGINE_VERSION,
  REFLECTION_PROMPT,
  type DerivedUpdate,
  type Reflection,
  type ReflectionStatus,
  type ReflectionTrigger,
  type SelfAssessmentLevel,
} from "./reflection-types";

/**
 * Creates a user-initiated reflection: computes the deterministic proposal,
 * snapshots the evaluated skill state + engine/policy versions, and stores it
 * immutably as 'proposed'. Returns the new reflection id.
 */
export async function createReflection(
  supabase: SupabaseClient,
  userId: string,
  payload: CreateReflectionPayload,
): Promise<string> {
  const evaluated = await loadEvaluatedSkillState(
    supabase,
    userId,
    payload.skill_key,
  );

  if (evaluated.status === "locked") {
    throw new Error("Cannot reflect on a locked skill.");
  }

  const derivedUpdates = deriveUpdates({
    skillKey: payload.skill_key,
    selfAssessment: payload.self_assessment,
  });

  const responseText =
    payload.response_text && payload.response_text.length > 0
      ? payload.response_text
      : null;

  const { data, error } = await supabase
    .from("reflections")
    .insert({
      user_id: userId,
      trigger: "user_initiated",
      skill_key: payload.skill_key,
      prompt_shown: REFLECTION_PROMPT,
      self_assessment: payload.self_assessment,
      response_text: responseText,
      derived_updates: derivedUpdates,
      status: "proposed",
      reflection_engine_version: REFLECTION_ENGINE_VERSION,
      mastery_policy_version: MASTERY_POLICY_VERSION,
      evaluated_mastery: evaluated.mastery,
      evaluated_confidence: evaluated.confidence,
      evaluated_status: evaluated.status,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create reflection: ${error.message}`);
  }

  const reflectionId = data.id as string;

  await appendHistoryEvent(supabase, userId, {
    eventType: "reflection_created",
    entityKind: "reflection",
    entityId: reflectionId,
    correlationId: newCorrelationId(),
    actor: "user",
    payload: {
      skill_key: payload.skill_key,
      self_assessment: payload.self_assessment,
    },
  });

  return reflectionId;
}

/**
 * Confirms a proposed reflection: commits each proposed update as Reflection
 * Evidence (via the Evidence subsystem), then flips the reflection to
 * 'confirmed'. Idempotent: only a still-'proposed' reflection is acted on, and
 * the Evidence layer de-duplicates on the reflection id.
 */
export async function confirmReflection(
  supabase: SupabaseClient,
  userId: string,
  reflectionId: string,
): Promise<void> {
  const { data: row, error } = await supabase
    .from("reflections")
    .select("id, status, derived_updates")
    .eq("id", reflectionId)
    .eq("user_id", userId)
    .eq("status", "proposed")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load reflection: ${error.message}`);
  }
  if (!row) {
    // Not found / not owned / already decided — nothing to confirm.
    return;
  }

  // One correlation for evidence_recorded + reflection_confirmed.
  const correlationId = newCorrelationId();

  const updates = (row.derived_updates as DerivedUpdate[]) ?? [];
  for (const update of updates) {
    if (update.kind !== "reflection_evidence") continue;
    await recordReflectionEvidence(supabase, userId, {
      reflectionId,
      skillKey: update.skillKey,
      impliedMastery: update.impliedMastery,
      correlationId,
    });
  }

  const { error: statusError } = await supabase
    .from("reflections")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("id", reflectionId)
    .eq("user_id", userId)
    .eq("status", "proposed");

  if (statusError) {
    throw new Error(`Failed to confirm reflection: ${statusError.message}`);
  }

  await appendHistoryEvent(supabase, userId, {
    eventType: "reflection_confirmed",
    entityKind: "reflection",
    entityId: reflectionId,
    correlationId,
    actor: "user",
  });
}

/** Declines a proposed reflection. The record is preserved as signal. */
export async function declineReflection(
  supabase: SupabaseClient,
  userId: string,
  reflectionId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("reflections")
    .update({ status: "declined" })
    .eq("id", reflectionId)
    .eq("user_id", userId)
    .eq("status", "proposed")
    .select("id, skill_key")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to decline reflection: ${error.message}`);
  }
  if (!data) return;

  await appendHistoryEvent(supabase, userId, {
    eventType: "reflection_declined",
    entityKind: "reflection",
    entityId: reflectionId,
    correlationId: newCorrelationId(),
    actor: "user",
    payload: { skill_key: (data.skill_key as string) ?? null },
  });
}

/** Lists the user's most recent reflections (newest first). */
export async function listReflections(
  supabase: SupabaseClient,
  userId: string,
  limit = 20,
): Promise<Reflection[]> {
  const { data, error } = await supabase
    .from("reflections")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load reflections: ${error.message}`);
  }

  return (data ?? []).map(toReflection);
}

type EvaluatedSkillState = {
  mastery: number;
  confidence: number;
  status: string;
};

async function loadEvaluatedSkillState(
  supabase: SupabaseClient,
  userId: string,
  skillKey: string,
): Promise<EvaluatedSkillState> {
  const { data, error } = await supabase
    .from("user_skill_mastery")
    .select("mastery, confidence, status")
    .eq("user_id", userId)
    .eq("skill_key", skillKey)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load skill state: ${error.message}`);
  }

  if (!data) {
    return { mastery: 0, confidence: 0, status: "available" };
  }

  return {
    mastery: Number(data.mastery),
    confidence: Number(data.confidence),
    status: (data.status as string) ?? "available",
  };
}

function toReflection(row: Record<string, unknown>): Reflection {
  return {
    id: row.id as string,
    trigger: row.trigger as ReflectionTrigger,
    skillKey: row.skill_key as string,
    promptShown: row.prompt_shown as string,
    selfAssessment: row.self_assessment as SelfAssessmentLevel,
    responseText: (row.response_text as string | null) ?? null,
    derivedUpdates: (row.derived_updates as DerivedUpdate[]) ?? [],
    status: row.status as ReflectionStatus,
    confirmedAt: (row.confirmed_at as string | null) ?? null,
    reflectionEngineVersion: row.reflection_engine_version as number,
    masteryPolicyVersion: row.mastery_policy_version as number,
    evaluatedMastery: Number(row.evaluated_mastery),
    evaluatedConfidence: Number(row.evaluated_confidence),
    evaluatedStatus: row.evaluated_status as string,
    createdAt: row.created_at as string,
  };
}
