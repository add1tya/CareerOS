# 0001 — Skill Graph: global ontology + per-user overlay

Status: Accepted
Date: 2026-07-16
Milestone: M4 (Sprint 4 — Skill Graph)

## Context

`docs/domain/skill-graph-schema.md` §10.1 originally modelled the Skill Graph as
a single per-user `skill_nodes` table: one row per user *per* skill, keyed by
`user_id` + `skill_key`, carrying both the ontology-sourced metadata (name,
domain, difficulty, estimated hours, …) and the user-specific state (mastery,
confidence, status). That duplicates all ontology metadata onto every user's
node set and blurs the line between user-agnostic domain knowledge and
per-user progress.

Sprint 4 needed the smallest correct persistence for: (1) a global AI-engineering
ontology (~48 skills + dependency edges) and (2) one user's current mastery over
that ontology, rendered as an inspection-only Skill Tree.

## Decision

Split the model into three tables, preserving a strict separation between the
**global ontology (required capabilities)** and the **per-user overlay
(current mastery)**:

- `skills` — GLOBAL, user-agnostic ontology (the required capabilities).
- `skill_dependencies` — GLOBAL prerequisite edges.
- `user_skill_mastery` — PER-USER overlay (`mastery`, `confidence`, `status`,
  `source`), keyed by (`user_id`, `skill_key`).

The assembled Skill Graph is a read-only *join* of ontology + overlay, never a
merged stored record.

### Immutable skill keys

`skill_key` is an **immutable identifier**. Once a skill key is introduced into
the ontology it must never be renamed or repurposed. `user_skill_mastery` and
`skill_dependencies` reference skills by `skill_key`; renaming one would silently
break per-user history and dependency edges, and would violate the append-only,
audit-preservation intent of the domain model. Retiring a skill is done by
marking it deprecated (future work), never by changing or deleting its key.

### Ontology versioning

`skills` and `skill_dependencies` carry an `ontology_version` column so ontology
*content* can evolve independently of the *schema* (per
`ai-engineering-knowledge-model.md` §6, recommendation 5). `display_order`
provides a stable, ontology-authored ordering for deterministic visualization.

## Consequences

- Ontology metadata is stored once, not duplicated per user.
- The global/overlay boundary is explicit and enforced by table design and RLS
  (ontology tables are read-only reference data for authenticated users; overlay
  rows are own-row read/write).
- `docs/domain/skill-graph-schema.md` §10.1 is updated to describe this model
  as the implemented mapping; the per-user `skill_nodes` description is retained
  only as historical context.
- Divergences deferred (unchanged intent, not yet implemented): Evidence,
  confidence decay, weighted mastery updates, `skill_goal_relevance`,
  finer-than-ontology node granularity, and dependency-threshold calibration.
- `skill_key` immutability is now a hard contract for all future ontology edits.
