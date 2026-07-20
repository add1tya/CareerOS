/**
 * History timeline (Sprint 10 / M10) — read-only audit view.
 *
 * Answers: "What has CareerOS recorded about my progress?"
 * Events are ordered by occurred_at DESC, then id DESC. Payload is convenience
 * metadata only; authoritative facts live on the referenced domain objects.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HistoryEvent } from "@/lib/history/history-types";

const EVENT_LABELS: Record<HistoryEvent["eventType"], string> = {
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
};

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

function payloadSummary(event: HistoryEvent): string | null {
  const parts: string[] = [];
  if (typeof event.payload.skill_key === "string") {
    parts.push(event.payload.skill_key);
  }
  if (typeof event.payload.evidence_type === "string") {
    parts.push(`type ${event.payload.evidence_type}`);
  }
  if (typeof event.payload.self_assessment === "string") {
    parts.push(event.payload.self_assessment);
  }
  if (typeof event.payload.tier === "number") {
    parts.push(`tier ${event.payload.tier}`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

function EventRow({ event }: { event: HistoryEvent }) {
  const summary = payloadSummary(event);
  return (
    <li className="rounded-lg border bg-card p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium">
          {EVENT_LABELS[event.eventType]}
        </span>
        <time
          className="text-xs text-muted-foreground"
          dateTime={event.occurredAt}
        >
          {formatWhen(event.occurredAt)}
        </time>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
        <span>actor: {event.actor}</span>
        <span>
          {event.entityKind}:{event.entityId.slice(0, 8)}…
        </span>
        <span title={event.correlationId}>
          corr:{event.correlationId.slice(0, 8)}…
        </span>
      </div>
      {summary ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{summary}</p>
      ) : null}
    </li>
  );
}

export function HistoryTimeline({ events }: { events: HistoryEvent[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">History</h1>
        <p className="text-sm text-muted-foreground">
          Append-only audit timeline of what CareerOS has recorded. Each event
          references a domain object — it does not duplicate that object&apos;s
          content. Related events from one action share a correlation id.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Timeline ({events.length} event{events.length === 1 ? "" : "s"})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No History events yet. Completing a task, creating a reflection, or
              generating a mission will start the log. Pre–Sprint-10 activity is
              not backfilled.
            </p>
          ) : (
            <ol className="space-y-2">
              {events.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
