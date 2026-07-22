/**
 * Timeline View (Sprint 20 / M20) — founder-facing projection over History.
 *
 * Elevates `/history`: correlation groups for readability; each entry keeps
 * event id, timestamp, and type (ADR-0017). Not analytics, not event sourcing.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  TimelineFact,
  TimelineGroup,
  TimelineView,
} from "@/lib/history/timeline-types";

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function FactRow({ fact }: { fact: TimelineFact }) {
  return (
    <li className="border-l-2 border-border pl-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{fact.eventTypeLabel}</span>
        <time
          className="text-xs text-muted-foreground"
          dateTime={fact.occurredAt}
        >
          {formatWhen(fact.occurredAt)}
        </time>
      </div>
      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
        <span>{fact.displayCategoryLabel}</span>
        <span>actor: {fact.actor}</span>
        <span title={fact.eventId}>id:{fact.eventId.slice(0, 8)}…</span>
        <span>
          {fact.entityKind}:{fact.entityId.slice(0, 8)}…
        </span>
      </div>
      {fact.summary ? (
        <p className="mt-1 text-xs text-muted-foreground">{fact.summary}</p>
      ) : null}
    </li>
  );
}

function GroupCard({ group }: { group: TimelineGroup }) {
  const multi = group.facts.length > 1;
  return (
    <li className="rounded-lg border bg-card p-3">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          {multi
            ? `${group.facts.length} related events`
            : "Single event"}
        </p>
        <span
          className="text-[11px] text-muted-foreground"
          title={group.correlationId}
        >
          corr:{group.correlationId.slice(0, 8)}…
        </span>
      </div>
      <ol className="space-y-2.5">
        {group.facts.map((fact) => (
          <FactRow key={fact.eventId} fact={fact} />
        ))}
      </ol>
    </li>
  );
}

export function TimelineViewPanel({ timeline }: { timeline: TimelineView }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Timeline</h1>
        <p className="text-sm text-muted-foreground">
          Structured view of the append-only History Event Log — how recorded
          actions cluster over time. This is an audit projection, not analytics
          and not a replay of domain state. Related events from one action share
          a correlation id (presentation grouping only).
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Only mutations written to History appear here. Pre–Sprint-10 activity
          and writes that never emitted History (for example goal creation at
          Career Graph init) are intentionally absent — nothing is inferred.
          Timeline policy v{timeline.timelineViewVersion} · History schema v
          {timeline.historySchemaVersion}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Journey log ({timeline.factCount} event
            {timeline.factCount === 1 ? "" : "s"} · {timeline.groups.length}{" "}
            group{timeline.groups.length === 1 ? "" : "s"})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No History events yet. Completing a task, recording evidence,
              updating hours, or overriding a recommendation will start the log.
            </p>
          ) : (
            <ol className="space-y-3">
              {timeline.groups.map((group) => (
                <GroupCard key={group.correlationId} group={group} />
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
