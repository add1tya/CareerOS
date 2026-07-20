# 0006 — Computed Roadmap / Planning Engine (v1)

Status: Accepted
Date: 2026-07-18
Milestone: M9 (Sprint 9 — Planning Engine / Roadmap v1)

## Context

Sprints 5–8 closed the deterministic learning loop for a single skill:
Recommendation → Mission → Quest → Task → Evidence → Mastery/Confidence →
Skill Graph, with Reflection feeding back in. What was missing is the "route"
half of CareerOS's routing-engine model: the Decision Engine answers *"what is
the single next skill?"* but nothing answers *"what is the whole path from here
to the goal, and where am I on it?"*

That path is the **Roadmap**. The documentation defines it precisely and
consistently: it is *"the current, computed sequence… never a stored, static
document"* (`glossary.md`), *"computed, never persisted"* (`career-graph-schema.md`
§3.9/§4, AR-01), and the Planning Engine that produces it *"writes nothing back
to a 'Roadmap' table, since none exists"* (§7.2). The Task Generation Engine is
already documented to *consume the Planning Engine's near-term Roadmap slice*
(`task-generation-engine.md` §1/§2) — a hole in the current system, since no
Planning Engine exists yet.

Sprint 9 fills that hole with exactly one new capability: a deterministic,
computed Roadmap. No new tables, no Claude, no adaptive/probabilistic planning.

## Decision

Add a **Planning Engine subsystem** (`apps/web/src/lib/planning/`) that computes
the Roadmap on demand from stored facts and renders it read-only at `/roadmap`.
The engine is a pure function; the service is a read-only shell; nothing is
persisted.

### Why the Roadmap is computed rather than stored

AR-01 and the architecture docs make this a hard commitment: the map (Career
Graph, Skill Graph, History, Constraints) is stored; the route (Roadmap) is
recomputed (`career-intelligence-engine.md` §1). Storing the Roadmap would
create a second source of truth that immediately drifts from the Skill Graph the
moment any Evidence lands. Computing it means it is always consistent with
current Mastery/Confidence/status, and it trivially preserves **replayability**
and **provenance**: the Roadmap is a pure projection of the append-only-derived
overlay, so there is nothing to migrate, reconcile, or replay — recompute and it
is correct by construction.

### Why the Roadmap represents navigation, not commitment

The Roadmap is a *view for orientation* — "here is the likely path" — not a
promise or a set of active work. Committed work is the materialized Mission/Quest/
Task the Execution Engine owns (AR-02). Keeping the Roadmap as navigation-only
means it can update freely as the user progresses without disturbing in-flight
work, and it never pressures the user with commitments they did not make
(no dark patterns; honest system behavior).

### Why it reuses the Decision Engine comparator

Ordering is decided by the **exact** `compareByFactors` used by the Decision
Engine, applied via a greedy topological pass that respects hard-dependency
gating. This is deliberate: one ordering source of truth means the Roadmap and
the Recommendation can never disagree. In fact the head of the Roadmap is, by
construction, the Decision Engine winner — the Planning Engine *generalizes* the
Decision Engine (single winner) into a full ordered path. Duplicating or
re-implementing ranking would risk silent divergence between "next skill" and
"the route."

### Why Missions remain materialized only for the current skill

The Roadmap projects the entire path, but only its **head** (the current
recommendation) is turned into an active Mission by the Execution Engine — the
materialization boundary from `career-graph-schema.md` §7.2. Materializing
Missions for upcoming skills would (a) persist speculative work the user has not
committed to, (b) create derived state that must be kept in sync as the Roadmap
recomputes, and (c) duplicate lazy generation (ADR-0003). Lazy, single-skill
materialization stays; the Roadmap only computes.

### Why ordering and effort are intentionally independent

Sequencing is determined **solely** by dependency constraints + the Decision
Engine comparator. Estimated effort and any ETA are **presentation only** and
never feed into ordering. Mixing effort into ordering would reintroduce exactly
the kind of weighted-sum scoring the deterministic ranking design rejects
(`factors.ts`: ordinals only, no invented coefficients), and would make the
order sensitive to soft, imprecise hour estimates. Keeping them separate means
the order is explainable purely in terms of prerequisites and priority, while
effort/ETA remain honest, clearly-labeled guidance.

### Ordering invariants (guaranteed by `computeRoadmap`)

1. **Completed skills always appear first** — mastered skills are emitted ahead
   of the path, for context.
2. **The current skill always follows the completed skills** — the first path
   element is the single `current` step.
3. **Upcoming skills always satisfy prerequisite ordering** — a skill is placed
   only after every HARD prerequisite is either already satisfied in current
   state or placed earlier in the path.
4. **No skill may appear twice** — each skill is emitted exactly once (completed,
   current, or upcoming), tracked by a placed-set.
5. **The first upcoming (current) step equals the current Recommendation** —
   because the initially-eligible pool is exactly the Decision Engine's candidate
   pool and the same comparator is used, the greedy pass's first pick is the
   Decision Engine winner.

### Supporting design choices (refinements)

- **Stable step identity:** every step exposes `stepId` derived from the skill,
  so UI/state references never depend on array position.
- **`blocked_by` explainability:** steps whose HARD prerequisites are unmet in
  the user's *current* state expose the specific blocking prerequisites (with
  required vs current mastery). This improves explainability and does **not**
  affect ordering.
- **Extensible model:** the full path lives on `Roadmap.steps`; future near-term
  / long-term **slices** derive from this same result — no recomputation or
  schema change needed. Slicing itself is deferred.
- **Versioned engine:** `PLANNING_ENGINE_VERSION` records the sequencing algorithm
  version so a computed Roadmap stays explainable/reproducible across future
  ordering changes, even though it is never stored (mirrors the mastery-policy /
  reflection-engine versioning of earlier sprints).

## Consequences

- New `planning/` subsystem: pure `roadmap-computer.ts`, read-only
  `planning-service.ts`, and `roadmap-types.ts`. `compareByFactors` is now
  exported from the Decision Engine as the shared ordering primitive.
- New `/roadmap` route + nav entry + `roadmap-view.tsx`. **No migration** — the
  Roadmap is computed (AR-01).
- The Planning Engine depends only on the pure Decision Engine comparator and
  the Skill Graph read model; it touches none of the Execution/Evidence/
  Reflection writers, keeping subsystem boundaries clean.
- Completing a Task or confirming a Reflection changes the overlay, which
  deterministically advances/reorders the Roadmap on the next load — the loop is
  now visibly a *route*, not just a next step.

### Divergences / deferred (deliberate, not silent)

- **V1 Roadmap is skill-granular.** The docs describe Roadmap at Mission/Quest
  granularity, but no grouping algorithm is specified; grouping is deferred to
  avoid inventing unspecified structure. Only the head materializes a Mission.
- **Goal impact remains proxied by `ontology_category`** (ADR-0002); the graph is
  not goal-pruned (V1 scope). `skill_goal_relevance` weighting is deferred.
- **Deferred entirely:** Mission grouping, adaptive replanning / inertia
  thresholds, AI/LLM planning, goal pruning, Roadmap persistence, History
  events, and the Reasoning-Trace entity (incl. `roadmap_adjustment` traces).
