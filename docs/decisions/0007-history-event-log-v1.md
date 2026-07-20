# 0007 — History Event Log (v1)

Status: Accepted
Date: 2026-07-20
Milestone: M10 (Sprint 10 — History Event Log)

## Context

Sprints 5–9 closed the deterministic planning, execution, and learning loop:
Decision → Planning → Execution → Evidence → Reflection, with a computed Roadmap.
Those subsystems now write to many tables (`skill_recommendations`, `missions`,
`quests`, `tasks`, `skill_evidence`, `reflections`, `user_skill_mastery`), but
nothing unified them into a Career Graph–level timeline.

`career-graph-schema.md` §3.14 defines **History** as that unifying,
append-only event log — “the raw material from which Learning Velocity,
Momentum, and all trend computations are derived.” AR-15 requires Evidence,
Reasoning Traces, and History to be append-only. Phase 3 exit criteria require
every mutation to write a History event, and Export to return “full Career Graph
+ History.” ADR-0005 and ADR-0006 deferred History while the producers were
being built; that debt is now due.

Sprint 10 introduces exactly one capability: the History Event Log. No Export,
Overrides, analytics, or Reasoning-Trace entity.

## Decision

Add a `history_events` table and a **History subsystem** (`apps/web/src/lib/history/`).
Impure services append an event **after** a successful domain write. A read-only
`/history` page shows the timeline. Pure engines never emit History.

### Why History is separate from Evidence

Evidence (`skill_evidence`) is the **source of truth for progress** — the
atomic unit that Mastery/Confidence reduce over (ADR-0004, AR-04). History is
the **cross-component audit index**: it records that Evidence was recorded, that
a Task completed, that a Mission was created, that a Reflection was declined —
across subsystems that are not Evidence. Collapsing them would either (a) force
non-progress events into the mastery pipeline, or (b) force progress math to
read a generic event log. Keeping Evidence for learning and History for the
timeline preserves both responsibilities.

### Why History is append-only

AR-15 and §3.14: History changes “only by addition, never by mutation or
deletion.” An audit trail that can be rewritten is not an audit trail. RLS
exposes SELECT + INSERT only — no UPDATE / DELETE policies — so immutability is
enforced at the database, matching Evidence and the project’s audit philosophy.

### Why references are stored instead of duplicated content

§3.14: `payload` is “a reference to the specific record the event pertains to,
not a duplicated copy of its content.” History stores `entity_kind` +
`entity_id` (plus optional light convenience metadata). Domain tables remain
authoritative. Duplicating content would create a second datastore that drifts,
complicates schema evolution, and contradicts “History is an index, not a
duplicate datastore” (Sprint 10 refinement 4).

### Why History is **not** an event-sourced architecture

Event sourcing rebuilds domain state by replaying events as the primary store.
CareerOS does **not** do that with History:

- Mastery/Confidence rebuild from the **Evidence** log (ADR-0004), not from
  History.
- Missions/Quests/Tasks/Reflections/Recommendations remain first-class tables.
- History indexes *that* something happened; it does not define *what* the
  current state is.

Treating History as event-sourcing would invert the architecture and force every
read path through a generic event reducer — complexity the docs never require.

### Why Roadmap recomputation does not emit History events

The Roadmap is **computed, never persisted** (AR-01, ADR-0006). Recomputing it
on page load is not a state mutation — nothing new is committed. Emitting
History for every Roadmap view would flood the log with non-events and blur the
line between observation and change. History records mutations to persisted
facts only.

### Supporting design choices (refinements)

- **`correlation_id`:** multiple events from one user action (e.g. task complete
  → quest complete → evidence recorded) share one id, grouping related rows
  without changing the event model.
- **Deterministic ordering:** primary `occurred_at DESC`, secondary `id DESC`,
  so timestamp collisions still replay consistently.
- **Past-tense event names:** `mission_created`, `evidence_recorded`,
  `reflection_confirmed`, … — one naming convention for all current and future
  types.
- **Payload is convenience only:** optional contextual metadata; never
  authoritative.
- **Extensible list API:** `listHistoryEvents(options)` accepts `limit` now;
  type/date filters are reserved on the options type without implementing them.
- **Forward-only:** no backfill of pre-Sprint-10 activity.
- **`history_schema_version`:** versions payload/shape evolution without
  rewriting rows.

## Consequences

- One new table (`history_events`) with insert-only RLS; one new subsystem;
  emitters wired into Decision, Execution, Evidence, and Reflection write paths.
- Completing a task produces a correlated set of History events (task, optional
  quest/mission, evidence). Confirming a reflection correlates
  `evidence_recorded` + `reflection_confirmed`.
- `/history` answers “What has CareerOS recorded about my progress?”
- Export, Overrides, Learning Velocity, Momentum, Risk, and Recovery can later
  *read* History without inventing a parallel audit mechanism.

### Divergences / deferred (deliberate, not silent)

- **Deferred entirely:** Data Export, Overrides/skip UX, Learning Velocity /
  Momentum / Risk / Recovery analytics, formal `reasoning_traces`,
  `skill_node_history`, adaptive behavior, Claude/LLM, and History filtering UI.
- **No backfill** of events for activity that occurred before this migration.
