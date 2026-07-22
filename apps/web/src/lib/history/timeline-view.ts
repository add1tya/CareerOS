/**
 * Pure Timeline View builder (Sprint 20 / M20).
 *
 * Pipeline: History Events → Timeline Facts → Timeline Groups.
 * No I/O. Does not reconstruct domain state, infer missing events, or mutate
 * History (ADR-0017).
 *
 * Ordering:
 *   - Groups: newest-first by latestOccurredAt DESC, then latestEventId DESC
 *   - Within group: chronological ASC by occurredAt, then id ASC (narrative)
 *
 * Input events are assumed already ordered by History
 * (occurred_at DESC, id DESC); this module does not re-query History.
 */
import type { HistoryEvent, HistoryPayload } from "@/lib/history/history-types";
import { HISTORY_SCHEMA_VERSION } from "@/lib/history/history-types";
import {
  EVENT_TYPE_DISPLAY_CATEGORY,
  TIMELINE_CATEGORY_LABELS,
  TIMELINE_EVENT_TYPE_LABELS,
  TIMELINE_VIEW_VERSION,
  type TimelineFact,
  type TimelineGroup,
  type TimelineView,
} from "@/lib/history/timeline-types";

/**
 * Projects History events into a Timeline View (facts + presentation groups).
 */
export function buildTimelineView(events: readonly HistoryEvent[]): TimelineView {
  const facts = events.map(toTimelineFact);
  const groups = groupFactsByCorrelation(facts);

  return {
    timelineViewVersion: TIMELINE_VIEW_VERSION,
    historySchemaVersion: HISTORY_SCHEMA_VERSION,
    groups,
    factCount: facts.length,
  };
}

export function toTimelineFact(event: HistoryEvent): TimelineFact {
  const displayCategory = EVENT_TYPE_DISPLAY_CATEGORY[event.eventType];
  return {
    eventId: event.id,
    occurredAt: event.occurredAt,
    eventType: event.eventType,
    eventTypeLabel: TIMELINE_EVENT_TYPE_LABELS[event.eventType],
    displayCategory,
    displayCategoryLabel: TIMELINE_CATEGORY_LABELS[displayCategory],
    actor: event.actor,
    entityKind: event.entityKind,
    entityId: event.entityId,
    correlationId: event.correlationId,
    summary: lightweightSummary(event.payload),
  };
}

function groupFactsByCorrelation(facts: TimelineFact[]): TimelineGroup[] {
  const byCorr = new Map<string, TimelineFact[]>();
  for (const fact of facts) {
    const list = byCorr.get(fact.correlationId) ?? [];
    list.push(fact);
    byCorr.set(fact.correlationId, list);
  }

  const groups: TimelineGroup[] = [];
  for (const [correlationId, members] of byCorr) {
    const sortedAsc = [...members].sort(compareFactsAsc);
    const latest = [...members].sort(compareFactsDesc)[0]!;
    groups.push({
      correlationId,
      latestOccurredAt: latest.occurredAt,
      latestEventId: latest.eventId,
      facts: sortedAsc,
    });
  }

  groups.sort((a, b) => {
    const t = b.latestOccurredAt.localeCompare(a.latestOccurredAt);
    if (t !== 0) return t;
    return b.latestEventId.localeCompare(a.latestEventId);
  });

  return groups;
}

function compareFactsAsc(a: TimelineFact, b: TimelineFact): number {
  const t = a.occurredAt.localeCompare(b.occurredAt);
  if (t !== 0) return t;
  return a.eventId.localeCompare(b.eventId);
}

function compareFactsDesc(a: TimelineFact, b: TimelineFact): number {
  return compareFactsAsc(b, a);
}

/** Concise convenience-payload summary — not an engineering dump. */
function lightweightSummary(payload: HistoryPayload): string | null {
  const parts: string[] = [];
  if (typeof payload.skill_key === "string") {
    parts.push(payload.skill_key);
  }
  if (typeof payload.evidence_type === "string") {
    parts.push(payload.evidence_type);
  }
  if (
    typeof payload.previous_hours_per_week === "number" &&
    typeof payload.new_hours_per_week === "number"
  ) {
    parts.push(
      `${payload.previous_hours_per_week}→${payload.new_hours_per_week} h/wk`,
    );
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}
