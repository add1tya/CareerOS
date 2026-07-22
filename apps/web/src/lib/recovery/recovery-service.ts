/**
 * Recovery service (Sprint 13 / M13).
 *
 * Thin read shell: loads History facts, injects `now`, returns the pure
 * Recovery projection. Writes NOTHING — no acknowledgement events, no mutable
 * recovery rows (ADR-0010 refinements 1, 4).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { computeRecoveryState } from "@/lib/recovery/recovery-detector";
import type {
  RecoveryHistoryFact,
  RecoveryState,
} from "@/lib/recovery/recovery-types";
import type { HistoryEventType } from "@/lib/history/history-types";

/**
 * Computes the user's current Recovery projection from History.
 * Fail-loud on query errors (AR-13).
 */
export async function getRecoveryState(
  supabase: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<RecoveryState> {
  const facts = await loadHistoryFacts(supabase, userId);
  return computeRecoveryState(facts, now);
}

async function loadHistoryFacts(
  supabase: SupabaseClient,
  userId: string,
): Promise<RecoveryHistoryFact[]> {
  const { data, error } = await supabase
    .from("history_events")
    .select("event_type, occurred_at")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to load history for recovery: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    eventType: row.event_type as HistoryEventType,
    occurredAt: row.occurred_at as string,
  }));
}
