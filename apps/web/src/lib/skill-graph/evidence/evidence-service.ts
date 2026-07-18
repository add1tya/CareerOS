/**
 * Evidence subsystem service (Sprint 7).
 *
 * The ONLY writer of Evidence and of Evidence-derived Mastery/Confidence/status.
 * The Execution Engine merely signals that a Task was completed; all learning
 * logic lives here, keeping the two subsystems independent.
 *
 * Flow (deterministic, fail-loud):
 *   1. Guard idempotency (a Task produces at most one Evidence record).
 *   2. Append an immutable Evidence row (snapshotting the policy version).
 *   3. Fold it into the overlay cache via the pure mastery policy.
 *   4. Link the Task to the Evidence it produced.
 *
 * The overlay write is incremental, but it applies the same pure `applyEvidence`
 * fold as a full replay would (see mastery-policy.replaySkillOverlay), so the
 * cache stays equal to a from-scratch replay of the Evidence log (ADR-0004).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  DEFAULT_SELF_REPORT_IMPLIED_MASTERY,
  EVIDENCE_TYPE_TIER,
  TASK_COMPLETION_EVIDENCE_SOURCE,
  TASK_COMPLETION_EVIDENCE_TYPE,
  type EvidenceTier,
} from "./evidence-types";
import {
  MASTERY_POLICY_VERSION,
  applyEvidence,
  deriveStatus,
  type MasteryState,
  type TierOrNone,
} from "./mastery-policy";

/** What the Evidence subsystem needs from a task-completion signal. */
export type RecordTaskEvidenceInput = {
  taskId: string;
  skillKey: string;
};

/**
 * Records the Evidence produced by completing a Task and updates the target
 * skill's overlay. Idempotent: a Task that already produced Evidence is a no-op.
 */
export async function recordTaskCompletionEvidence(
  supabase: SupabaseClient,
  userId: string,
  input: RecordTaskEvidenceInput,
): Promise<void> {
  const { data: taskRow, error: taskError } = await supabase
    .from("tasks")
    .select("id, status, evidence_ref, generated_from_skill_key")
    .eq("id", input.taskId)
    .eq("user_id", userId)
    .maybeSingle();

  if (taskError) {
    throw new Error(`Failed to load task for evidence: ${taskError.message}`);
  }
  // Not found / not owned, not actually completed, or already recorded.
  if (!taskRow || taskRow.status !== "completed" || taskRow.evidence_ref) {
    return;
  }

  const skillKey = (taskRow.generated_from_skill_key as string) ?? input.skillKey;

  const currentState = await loadCurrentState(supabase, userId, skillKey);
  const unlocked = currentState.status !== "locked";

  const tier = EVIDENCE_TYPE_TIER[TASK_COMPLETION_EVIDENCE_TYPE];
  const evidence = {
    tier,
    impliedMastery: DEFAULT_SELF_REPORT_IMPLIED_MASTERY,
  };

  const nextState = applyEvidence(currentState.state, evidence);

  // 2. Append immutable Evidence (policy version snapshotted per refinement 1).
  const { data: insertedEvidence, error: insertError } = await supabase
    .from("skill_evidence")
    .insert({
      user_id: userId,
      skill_key: skillKey,
      type: TASK_COMPLETION_EVIDENCE_TYPE,
      tier,
      implied_mastery: DEFAULT_SELF_REPORT_IMPLIED_MASTERY,
      content_ref: input.taskId,
      source: TASK_COMPLETION_EVIDENCE_SOURCE,
      generated_from_task_id: input.taskId,
      mastery_policy_version: MASTERY_POLICY_VERSION,
    })
    .select("id")
    .single();

  if (insertError) {
    // Unique violation on generated_from_task_id => another request already
    // recorded this Task's Evidence. Treat as an idempotent no-op.
    if (insertError.code === "23505") {
      return;
    }
    throw new Error(`Failed to append evidence: ${insertError.message}`);
  }

  const evidenceId = insertedEvidence.id as string;

  // Provenance: the strongest Evidence supporting this skill's confidence.
  const highestTierEvidenceId =
    tier > currentState.state.highestTier
      ? evidenceId
      : currentState.highestTierEvidenceId;

  const status = deriveStatus({
    unlocked,
    mastery: nextState.mastery,
    confidence: nextState.confidence,
    hasEvidence: true,
    highestTier: nextState.highestTier,
  });

  // 3. Fold into the overlay cache.
  const { error: overlayError } = await supabase
    .from("user_skill_mastery")
    .upsert(
      {
        user_id: userId,
        skill_key: skillKey,
        mastery: nextState.mastery,
        confidence: nextState.confidence,
        status,
        source: "evidence",
        last_evidence_id: evidenceId,
        highest_tier_evidence_id: highestTierEvidenceId,
        evidence_count: nextState.evidenceCount,
        mastery_policy_version: MASTERY_POLICY_VERSION,
      },
      { onConflict: "user_id,skill_key" },
    );

  if (overlayError) {
    throw new Error(`Failed to update skill overlay: ${overlayError.message}`);
  }

  // 4. Link the Task to the Evidence it produced.
  const { error: linkError } = await supabase
    .from("tasks")
    .update({ evidence_ref: evidenceId })
    .eq("id", input.taskId)
    .eq("user_id", userId);

  if (linkError) {
    throw new Error(`Failed to link task to evidence: ${linkError.message}`);
  }
}

type CurrentState = {
  state: MasteryState;
  status: string;
  highestTierEvidenceId: string | null;
};

/**
 * Reads the current overlay row into a policy MasteryState. The overlay is a
 * cache; if a row is somehow missing it is treated as the empty state (an
 * unlocked, no-evidence skill), consistent with a from-scratch replay.
 */
async function loadCurrentState(
  supabase: SupabaseClient,
  userId: string,
  skillKey: string,
): Promise<CurrentState> {
  const { data: row, error } = await supabase
    .from("user_skill_mastery")
    .select(
      "mastery, confidence, status, evidence_count, highest_tier_evidence_id",
    )
    .eq("user_id", userId)
    .eq("skill_key", skillKey)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load skill overlay: ${error.message}`);
  }

  if (!row) {
    return {
      state: { mastery: 0, confidence: 0, highestTier: 0, evidenceCount: 0 },
      status: "available",
      highestTierEvidenceId: null,
    };
  }

  const highestTierEvidenceId =
    (row.highest_tier_evidence_id as string | null) ?? null;
  const highestTier = await loadEvidenceTier(
    supabase,
    highestTierEvidenceId,
  );

  return {
    state: {
      mastery: Number(row.mastery),
      confidence: Number(row.confidence),
      highestTier,
      evidenceCount: (row.evidence_count as number) ?? 0,
    },
    status: (row.status as string) ?? "available",
    highestTierEvidenceId,
  };
}

/** Resolves the tier of the current highest-tier Evidence (0 if none). */
async function loadEvidenceTier(
  supabase: SupabaseClient,
  evidenceId: string | null,
): Promise<TierOrNone> {
  if (!evidenceId) return 0;

  const { data, error } = await supabase
    .from("skill_evidence")
    .select("tier")
    .eq("id", evidenceId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load evidence tier: ${error.message}`);
  }
  return data ? ((data.tier as EvidenceTier) ?? 0) : 0;
}
