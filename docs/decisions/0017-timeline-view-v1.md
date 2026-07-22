# 0017 — Timeline View v1 (History projection)

Status: Accepted
Date: 2026-07-21
Milestone: M20 (Sprint 20 — Timeline View v1)

## Context

Sprint 10 shipped the append-only History Event Log and a flat `/history` list
(ADR-0007). The deterministic platform and explainability stack are now
complete. What remained was a **journey-oriented** presentation of the same
audit facts: correlation grouping for readability, clear labels, and honest
coverage limits — without analytics, AI, or event sourcing.

Sprint 20 elevates `/history` into **Timeline View v1**: a pure projection over
History. It does not add persistence, synthesize events, or change any writer.

## Decision

Add a Timeline View subsystem that:

1. Defines **`TIMELINE_VIEW_VERSION`** independently of `HISTORY_SCHEMA_VERSION`.
2. Pipelines **History Events → Timeline Facts → Timeline Groups → UI**.
3. Groups by existing `correlation_id` for readability only.
4. Preserves every event’s **id**, **timestamp**, and **event type** in the UI.
5. Uses **display categories** as presentation configuration only — History
   event types remain authoritative (no new domain taxonomy).
6. Keeps payload rendering lightweight (concise convenience summary only).
7. Lives on **`/history`** (elevated), not a duplicate route.

### Timeline vs History

| | History Event Log | Timeline View |
|---|---|---|
| Owns event creation | Yes | No |
| Owns append-only semantics / list order from DB | Yes | No — consumes listed events |
| Owns grouping / presentation | No | Yes |
| Source of truth | `history_events` | Projection of that log |

### Timeline vs Event Sourcing

Timeline does **not** rebuild Mastery, Missions, or Recommendations by replaying
events. Domain tables remain authoritative; Evidence remains the mastery log
(ADR-0004 / 0007). Timeline indexes *that* something was recorded.

### Timeline vs Analytics

Timeline does not compute rates, charts, trends, or predictive insights.
Recovery/Risk/Opportunity may project *from* History for their own policies;
Timeline does not subsume them.

### Why grouping is presentation-only

`correlation_id` already groups events from one user action (ADR-0007). Bundling
them in the UI improves readability. It must not merge rows, drop identity, or
change audit meaning. Within a group, facts are shown chronological ASC (how
the action unfolded); groups are ordered newest-first by latest member.

### Why missing events remain absent

History is forward-only and incomplete by design (e.g. no `goal_created`;
pre–Sprint-10 activity not backfilled). Inferring rows from domain tables would
synthesize a second timeline and violate “History-only input.” Gaps stay visible
as gaps; the UI states that explicitly.

### Why `/history` is elevated rather than duplicated

One product question: “What has been recorded about my journey?” Two routes
would split the audit surface and invite drift. Elevating `/history` keeps a
single nav entry and a single read path over `listHistoryEvents`.

### Ownership

- **History:** create, append-only, deterministic list ordering.
- **Timeline:** facts projection, grouping, labels, readability.

Timeline must never influence Decision, Planning, Mastery, or History writes.

## Consequences

- `/history` shows correlation-grouped Timeline View.
- Flat `HistoryTimeline` list is replaced by the grouped projection.
- Analytics, replay, AI summaries, deep domain joins, filters, `goal_created`
  History events, and predictive insights remain deferred.

### Divergences / deferred (deliberate, not silent)

- Service-level History filters (still reserved on options type)
- Deep links / joins to domain rows for rich detail
- `goal_created` / career-graph-init History emission
- Analytics dashboards
- Event-sourced rebuild
- Separate `/timeline` route
