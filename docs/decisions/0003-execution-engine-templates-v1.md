# 0003 — Deterministic Execution Engine + versioned templates (v1)

Status: Accepted
Date: 2026-07-17
Milestone: M-execution (Sprint 6 — Execution Engine v1)

## Context

The Decision Engine (ADR-0002) recommends a single **Skill**. To be usable for a
real decision, that recommendation must become concrete work. Sprint 6 builds the
**Execution Engine**, which converts the recommended Skill into a hierarchy:

```
Recommendation → Mission → Quest → Task
```

Scope is deliberately narrow (per the domain model and V1 rules): one active
recommendation → one Mission → one active Quest → 3–5 executable Tasks. The only
user action is completing a Task. Explicitly **out of scope**: Evidence, Mastery/
Confidence updates, XP, streaks, reflection, adaptive planning, recommendation
changes, and any Claude/LLM involvement. Task candidates come from the ontology's
Suggested Projects (AR-09), not from a model.

Missions/Quests/Tasks are **persisted** because they are committed active work
(AR-02) — unlike the Roadmap, which stays computed (AR-01).

## Decision

Generate the hierarchy **deterministically from hand-authored templates**. Given
the same recommendation and template version, generation is reproducible: no
randomness, no scoring, no AI.

### 1. Templates are versioned, immutable assets

Each supported skill has one `SkillExecutionTemplate` (TypeScript object) carrying
a `templateVersion`. Every generated Mission persists the `template_key` **and**
`template_version` it was produced from.

**Why:** Execution templates are long-lived and will be revised as we learn what
good work looks like. Treating them like database migrations — append/bump a
version, never rewrite history — means a user's in-flight Mission is never mutated
out from under them by a later authoring change. A template revision bumps
`templateVersion`; only **new** Missions pick it up.

Immutability is enforced at the one place a Mission could grow: when generating
the next Quest, the engine refuses to extend a Mission from a `templateVersion`
different than the one it was frozen at. If the template was revised (or removed),
the Mission simply completes the Quests it already has rather than mixing versions.
(V1 keeps only the latest version of each template in code; retaining historical
versions is a future refinement if cross-version extension is ever needed.)

### 2. Templates are separated from generated instances

Two distinct type families, never conflated:

| Template (definition) | Instance (runtime) |
|---|---|
| `MissionTemplate` / `SkillExecutionTemplate.mission` | `missions` row → `MissionInstance` |
| `QuestTemplate` | `quests` row → `QuestInstance` |
| `TaskTemplate` | `tasks` row → `TaskInstance` |

Templates live under `apps/web/src/lib/execution-engine/templates/` (one file per
skill, registered in `index.ts`). Instances live in Postgres, are user-scoped, and
are the only thing that changes at runtime.

**Why:** A reusable definition and a user's specific, mutable work item have
different lifecycles and owners. Editing a template must never reach into a user's
generated data. This mirrors code-vs-data / class-vs-object separation and keeps
each side free to evolve.

### 3. Full provenance on every Mission

Each Mission persists `generated_from_skill_key`, `generated_from_recommendation_id`,
`generated_at`, plus `template_key` + `template_version`.

**Why:** The Execution Engine must be explainable end to end. Provenance preserves
the complete chain Recommendation → Mission → Quest → Task, so we can always answer
"why does this Mission exist?" and reproduce exactly how it was generated —
consistent with the project's reasoning-trace and audit philosophy. It also gives
generation a natural **idempotency key**: the Mission for a recommendation is
looked up by `generated_from_recommendation_id`, so re-rendering the dashboard
never creates duplicates.

### 4. Lazy generation, not eager

Creating a Mission materializes **only its first Quest and that Quest's Tasks**.
The next Quest (and its Tasks) is generated only when the active Quest's Tasks are
all complete. The Mission completes when no further Quest remains.

**Why:** Aligns with "compute rather than persist" — we keep derived state
minimal and avoid writing work the user may never reach. It also makes future
adaptivity cheaper: because only the active slice is materialized, later sprints
can change what the *next* Quest is without discarding a pre-generated plan.

Task completion is the only user action; Quest completion and next-Quest
generation are **deterministic server-side consequences** of all Tasks in a Quest
being done. These transitions are guarded (conditional updates + a
`unique(mission_id, order_index)` constraint) to stay idempotent under
double-submit.

## Consequences

- The core loop is now real: sign in → recommendation → mission → today's tasks →
  complete tasks → advance. The founder can use it for an actual decision.
- Three new user-scoped tables (`missions`, `quests`, `tasks`) with RLS (AR-16).
  Unlike the append-only decision history, these allow `update` (task completion +
  deterministic transitions); there is no `delete` policy.
- Generation is fully deterministic and auditable; no AI paths exist yet.

### Divergences / deferred (deliberate, not silent)

- **Quest/Mission completion exists**, though the earlier framing was
  "task-completion only." It is required by lazy generation (a completed Quest is
  the trigger for the next). It remains a pure deterministic consequence of task
  completion — not a separate user action, and not adaptive.
- **No historical template versions in code yet.** A revised template freezes
  in-flight Missions at their current Quests instead of extending them across
  versions. Retaining old versions is deferred until a real need exists.
- **Deferred entirely:** Evidence, Mastery/Confidence updates, XP, streaks,
  reflection, adaptive planning, recommendation changes, and Claude/LLM
  personalization or narrative (arrives no earlier than M6, AR-10).
