/**
 * History Event Log types (Sprint 10 / M10).
 *
 * Career Graph append-only audit timeline (career-graph-schema.md §3.14, AR-15).
 * History is an INDEX of what happened — references to domain objects plus
 * optional light payload — never a duplicate datastore and never an
 * event-sourced rebuild of state (ADR-0007).
 *
 * Naming convention (refinement 3): all event types are past-tense verb phrases
 * (`mission_created`, `evidence_recorded`, …). Future types must follow the same
 * pattern; extending the set is an additive migration.
 *
 * Ordering (refinement 2): list reads are deterministic —
 *   primary:   occurred_at DESC
 *   secondary: id DESC
 * so timestamp collisions still replay consistently.
 */
export const HISTORY_SCHEMA_VERSION = 1;

/**
 * V1 event catalog. Past-tense only. Keep in sync with the migration CHECK.
 */
export const HISTORY_EVENT_TYPES = [
  "recommendation_recorded",
  "mission_created",
  "quest_created",
  "quest_completed",
  "mission_completed",
  "task_completed",
  "evidence_recorded",
  "reflection_created",
  "reflection_confirmed",
  "reflection_declined",
] as const;

export type HistoryEventType = (typeof HISTORY_EVENT_TYPES)[number];

export const HISTORY_ENTITY_KINDS = [
  "skill_recommendation",
  "mission",
  "quest",
  "task",
  "skill_evidence",
  "reflection",
] as const;

export type HistoryEntityKind = (typeof HISTORY_ENTITY_KINDS)[number];

export const HISTORY_ACTORS = [
  "user",
  "decision_engine",
  "execution_engine",
  "evidence_engine",
  "reflection_engine",
] as const;

export type HistoryActor = (typeof HISTORY_ACTORS)[number];

/** Optional convenience metadata. Authoritative facts live on the entity. */
export type HistoryPayload = Record<string, string | number | boolean | null>;

export type AppendHistoryEventInput = {
  eventType: HistoryEventType;
  entityKind: HistoryEntityKind;
  entityId: string;
  /** Groups related events from one user action. Required. */
  correlationId: string;
  actor: HistoryActor;
  /** Convenience only — omit or keep minimal. */
  payload?: HistoryPayload;
};

export type HistoryEvent = {
  id: string;
  eventType: HistoryEventType;
  entityKind: HistoryEntityKind;
  entityId: string;
  correlationId: string;
  actor: HistoryActor;
  payload: HistoryPayload;
  historySchemaVersion: number;
  occurredAt: string;
};

/**
 * List options. `limit` is implemented now; event type / date-range filters are
 * reserved so callers can adopt them later without changing the model
 * (refinement 5). Do not implement those filters in V1.
 */
export type ListHistoryEventsOptions = {
  limit?: number;
  // Reserved (not implemented):
  // eventTypes?: HistoryEventType[];
  // occurredAfter?: string;
  // occurredBefore?: string;
};
