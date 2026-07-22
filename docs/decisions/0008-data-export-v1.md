# 0008 — Data Export v1

Status: Accepted
Date: 2026-07-20
Milestone: M11 (Sprint 11 — Data Export)

## Context

Sprints 3–10 persist a complete deterministic Career Graph loop (profile, goals,
constraints, skill overlay, recommendations, missions/quests/tasks, evidence,
reflections, history). Guiding Principle 27 / PR-19 / V1 Definition of Done #10
require that this data be **exportable in a plain, human-readable format at any
time**. Phase 3 orders Export after the History emitter and requires: “Export
returns full Career Graph + History.” ADR-0007 deferred Export until History
existed; that prerequisite is now met.

Sprint 11 adds exactly one capability: on-demand Data Export. No import,
overrides, analytics, or Claude.

## Decision

Add an **Export subsystem** that:

1. Assembles a versioned `CareerOsExport` document from persisted domain data
   (plus one explicitly labeled computed Roadmap snapshot).
2. Renders that document via **pure** Markdown and JSON formatters.
3. Serves downloads from authenticated `GET /api/export?format=markdown|json`.

No new tables. No persisted export artifacts. No History event for the export
action itself.

### Deterministic section order

Every export — Markdown and JSON — emits sections in this fixed order
(`EXPORT_SECTION_ORDER`):

1. Metadata
2. Profile
3. Career Graph
4. Skill Graph
5. Execution
6. Evidence
7. Reflection
8. History
9. Computed Snapshots

Stable ordering enables reliable diffs across exports of the same schema
version.

### Why Export is a read-only ownership capability

Export answers *“Can I take my career data with me?”* It does not decide what to
learn next, update mastery, or plan a route. It is a trust/ownership surface
(Principle 27), not a Decision/Planning/Execution engine. Keeping it read-only
prevents conflating “download my data” with “mutate my career state.”

### Why no new persistence is introduced

The Career Graph is already the store. Persisting export files would create a
second, stale copy of user data and invite sync bugs. Lazy, on-demand assembly
matches Protocol §4 (prefer lazy generation) and AR-01’s spirit for derived
views: compute when needed; do not store derived dumps as source of truth.

### Why History is included

Phase 3 exit criterion and ADR-0007: Export without History is incomplete
relative to the documented Career Graph. History is the cross-component audit
index; including it (in Sprint 10’s deterministic order) makes the download a
full ownership package, not only the latest overlay snapshot.

### Why computed snapshots are labeled

The Roadmap is computed, never persisted (AR-01, ADR-0006). Including a
point-in-time snapshot is valuable for the founder, but it must never be
mistaken for stored state. The export marks `computed: true` with an explicit
note. Formatters never invent placeholder domain content — empty arrays/nulls
mean “nothing persisted,” not fabricated rows (refinement 4).

### Why no History event is emitted for Export

Export is a **read**. Emitting `export_generated` would require extending the
History event catalog (a migration) for an action that does not change domain
state. Auditing downloads can be added later if needed; V1 keeps Export
side-effect-free so the log remains a record of mutations, not observations.

### Why only user-relevant ontology metadata is exported

The Skill Graph section exports the user’s assembled graph (overlay + skill
metadata needed for legibility: name, domain, category, etc.) and the
dependency edges in that graph. It does not treat “export” as a dump of an
unrelated global catalog for its own sake — the map the user routes over is what
belongs in *their* data package. Global seed maintenance stays in migrations /
ontology docs, not in personal exports.

### Supporting design choices (refinements)

- **Self-describing metadata:** `export_schema_version`, `generated_at`,
  `planning_engine_version`, `mastery_policy_version`,
  `reflection_engine_version`, `history_schema_version`.
- **Pure formatters:** Markdown/JSON transform only an assembled
  `CareerOsExport` — no database access.
- **Stable JSON within a schema version:** field names/structure fixed;
  incompatible changes bump `EXPORT_SCHEMA_VERSION`.
- **Fail loud:** assembly or section load failures return an error, never a
  silently partial “success” file (AR-13).

## Consequences

- New `export/` library, `/export` page, `/api/export` route, nav link.
- Founder can download Markdown (human primary) and JSON (machine companion).
- Import/restore, scheduled exports, overrides, analytics, reasoning traces,
  and Claude remain deferred.

### Divergences / deferred (deliberate, not silent)

- **Deferred entirely:** Import / restore, scheduled exports, Overrides, Learning
  Velocity / Momentum / Risk / Recovery, formal `reasoning_traces`, Claude /
  mentor chat, adaptive behavior, and History events for export downloads.
