/**
 * Timeline View types + policy v1 (Sprint 20 / M20).
 *
 * Timeline is a READ MODEL / projection over immutable History events
 * (ADR-0017). It must never reconstruct domain state, infer missing events,
 * replay aggregates, or influence any subsystem.
 *
 * Pipeline:
 *   History Events
 *     → Timeline Facts
 *       → Timeline Groups
 *         → UI
 *
 * Grouping is presentation-only. History event types remain authoritative;
 * display categories are UI configuration only.
 *
 * TIMELINE_VIEW_VERSION is independent of HISTORY_SCHEMA_VERSION.
 */
import type {
  HistoryActor,
  HistoryEntityKind,
  HistoryEventType,
} from "@/lib/history/history-types";

/** Bump when grouping rules or timeline fact structure change. */
export const TIMELINE_VIEW_VERSION = 1;

/**
 * Presentation categories only — not a domain taxonomy.
 * Map is config for UI organization.
 */
export const TIMELINE_DISPLAY_CATEGORIES = [
  "decision",
  "execution",
  "evidence",
  "reflection",
  "override",
  "constraint",
  "other",
] as const;
export type TimelineDisplayCategory =
  (typeof TIMELINE_DISPLAY_CATEGORIES)[number];

/** Authoritative event type → display category (presentation config). */
export const EVENT_TYPE_DISPLAY_CATEGORY: Record<
  HistoryEventType,
  TimelineDisplayCategory
> = {
  recommendation_recorded: "decision",
  mission_created: "execution",
  quest_created: "execution",
  quest_completed: "execution",
  mission_completed: "execution",
  task_completed: "execution",
  evidence_recorded: "evidence",
  reflection_created: "reflection",
  reflection_confirmed: "reflection",
  reflection_declined: "reflection",
  recommendation_overridden: "override",
  task_skipped: "override",
  constraint_updated: "constraint",
};

export const TIMELINE_CATEGORY_LABELS: Record<TimelineDisplayCategory, string> =
  {
    decision: "Decision",
    execution: "Execution",
    evidence: "Evidence",
    reflection: "Reflection",
    override: "Override",
    constraint: "Constraint",
    other: "Other",
  };

/** Concise human labels for event types (presentation). */
export const TIMELINE_EVENT_TYPE_LABELS: Record<HistoryEventType, string> = {
  recommendation_recorded: "Recommendation recorded",
  mission_created: "Mission created",
  quest_created: "Quest created",
  quest_completed: "Quest completed",
  mission_completed: "Mission completed",
  task_completed: "Task completed",
  evidence_recorded: "Evidence recorded",
  reflection_created: "Reflection created",
  reflection_confirmed: "Reflection confirmed",
  reflection_declined: "Reflection declined",
  recommendation_overridden: "Recommendation overridden",
  task_skipped: "Task skipped",
  constraint_updated: "Constraint updated",
};

/**
 * One History event as a Timeline Fact — identity preserved for audit.
 */
export type TimelineFact = {
  eventId: string;
  occurredAt: string;
  eventType: HistoryEventType;
  eventTypeLabel: string;
  displayCategory: TimelineDisplayCategory;
  displayCategoryLabel: string;
  actor: HistoryActor;
  entityKind: HistoryEntityKind;
  entityId: string;
  correlationId: string;
  /** Lightweight one-line summary from convenience payload only. */
  summary: string | null;
};

/**
 * Presentation group: events sharing a correlation_id.
 * Does not replace or hide member event identity.
 */
export type TimelineGroup = {
  correlationId: string;
  /** Latest occurredAt in the group (for group ordering). */
  latestOccurredAt: string;
  /** Latest event id among those at latestOccurredAt (tie-break). */
  latestEventId: string;
  /** Member facts in chronological ASC (action narrative). */
  facts: TimelineFact[];
};

export type TimelineView = {
  timelineViewVersion: number;
  historySchemaVersion: number;
  groups: TimelineGroup[];
  /** Total facts included (after History list limit). */
  factCount: number;
};
