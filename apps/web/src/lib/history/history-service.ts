/**
 * History Event Log service (Sprint 10 / M10).
 *
 * Thin, impure shell around the append-only `history_events` table. Other
 * subsystems call `appendHistoryEvent` AFTER a successful domain write; pure
 * engines never import this module.
 *
 * Fail-loud (AR-13): a failed History insert throws — silent audit gaps are not
 * acceptable. History does not rebuild domain state; it only indexes what
 * already landed in domain tables (ADR-0007).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  HISTORY_SCHEMA_VERSION,
  type AppendHistoryEventInput,
  type HistoryEvent,
  type HistoryPayload,
  type ListHistoryEventsOptions,
} from "@/lib/history/history-types";

/** Fresh correlation id for one user action (groups related History events). */
export function newCorrelationId(): string {
  return crypto.randomUUID();
}

/**
 * Appends one immutable History event. Call only after the referenced domain
 * write has succeeded.
 */
export async function appendHistoryEvent(
  supabase: SupabaseClient,
  userId: string,
  input: AppendHistoryEventInput,
): Promise<string> {
  const { data, error } = await supabase
    .from("history_events")
    .insert({
      user_id: userId,
      event_type: input.eventType,
      entity_kind: input.entityKind,
      entity_id: input.entityId,
      correlation_id: input.correlationId,
      actor: input.actor,
      payload: input.payload ?? {},
      history_schema_version: HISTORY_SCHEMA_VERSION,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to append history event: ${error.message}`);
  }

  return data.id as string;
}

/**
 * Lists History events newest-first with deterministic secondary ordering by
 * `id` (refinement 2). Filtering by type / date range is reserved on the options
 * type but not implemented yet (refinement 5).
 */
export async function listHistoryEvents(
  supabase: SupabaseClient,
  userId: string,
  options: ListHistoryEventsOptions = {},
): Promise<HistoryEvent[]> {
  const limit = options.limit ?? 100;

  const { data, error } = await supabase
    .from("history_events")
    .select("*")
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load history events: ${error.message}`);
  }

  return (data ?? []).map(toHistoryEvent);
}

function toHistoryEvent(row: Record<string, unknown>): HistoryEvent {
  return {
    id: row.id as string,
    eventType: row.event_type as HistoryEvent["eventType"],
    entityKind: row.entity_kind as HistoryEvent["entityKind"],
    entityId: row.entity_id as string,
    correlationId: row.correlation_id as string,
    actor: row.actor as HistoryEvent["actor"],
    payload: (row.payload as HistoryPayload) ?? {},
    historySchemaVersion: row.history_schema_version as number,
    occurredAt: row.occurred_at as string,
  };
}
