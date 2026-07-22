# 0015 — Roadmap Explainability v1 (projection)

Status: Accepted
Date: 2026-07-21
Milestone: M18 (Sprint 18 — Roadmap Explainability v1)

## Context

Sprint 17 made the Decision Engine’s single next skill explainable from a
persisted factor snapshot (ADR-0014). The Planning Engine already computes a
full Roadmap (ADR-0006) with per-step `whyHere` and `blockedBy`, but `/roadmap`
did not yet offer a structured, path-level explanation of *why the route is
ordered this way*.

Sprint 18 adds that surface as a **pure projection** over the computed Roadmap
artifact. It does not regenerate or reorder the path, does not persist a
Roadmap, and does not change Planning policy.

## Decision

Add a Roadmap Explainability subsystem that:

1. Defines **`ROADMAP_EXPLANATION_VERSION`** independently of
   `PLANNING_ENGINE_VERSION`.
2. Pipelines **Roadmap → Path Facts + Step Facts → Roadmap Explanation → UI**.
3. Builds explanations **only** from fields already present on the computed
   `Roadmap` (structure, kinds, `whyHere`, `blockedBy`, effort totals, goal title).
4. Limits step comparisons to **current vs immediate next upcoming**.
5. Surfaces one **path-level** panel on `/roadmap` while keeping existing
   per-step `whyHere` lines.

### Explainability vs Planning

| | Planning Engine | Roadmap Explainability |
|---|---|---|
| Role | Order the path | Explain an already-ordered path |
| Owns ordering / deps? | Yes | No — observes only |
| May call `computeRoadmap` / `compareByFactors`? | Yes | Never |
| May traverse Skill Graph for ordering? | Yes (inside planner) | Never |

Explainability must not influence Planning, Decision, suppression, or mastery.

### Why Roadmaps are explained from computed artifacts

Unlike Decision Explainability (persisted `skill_recommendations.factors`), the
Roadmap is **never stored** (AR-01 / ADR-0006). The authoritative explanation
input is therefore the **computed Roadmap for this load** — itself a pure
projection of Skill Graph + Goal + suppression. Replayability holds because
identical stored facts + `PLANNING_ENGINE_VERSION` → identical Roadmap →
identical explanation under a fixed `ROADMAP_EXPLANATION_VERSION`.

### Why no persistence exists

Persisting Roadmap or explanation rows would create a second source of truth
that drifts from the Skill Graph the moment Evidence lands — the failure AR-01
exists to prevent. Export may include a computed Roadmap snapshot for
portability; that does not make the Roadmap a domain store. Explanation stays
derived on view.

### Why current vs next comparison is sufficient

Path-level structure answers “completed → current → upcoming.” The Decision
analogue to winner/runner-up on a route is **current vs immediate next**.
Explaining every pairwise adjacency would duplicate per-step `whyHere` and imply
a denser optimization narrative than the greedy topo actually implements.
Absent / non-path skills are intentionally not explained — they are not
Planning outputs on this artifact.

### Constraints, not optimizations

Copy states prerequisites, `blockedBy`, current stage, and path structure. It
does not invent optimization goals (e.g. “fastest path,” “best ROI”) the
planner does not implement. Effort is labeled presentation-only.

### Only planner-represented reasons

The builder must not infer rationale beyond Roadmap fields. Placement prose
comes from existing `whyHere`; blocking from `blockedBy`; structure from
`kind` counts and aggregates.

## Consequences

- `/roadmap` shows a path-level explanation panel.
- Per-step `whyHere` remains; no per-step essay duplication.
- Planning computer, Decision ranking, Export schema unchanged.
- Adaptive replanning, Roadmap history, reasoning traces, Mentor chat, and
  Claude remain deferred.

### Divergences / deferred (deliberate, not silent)

- Roadmap / explanation persistence
- Explaining skills not on the computed path
- Pairwise explanation of the full path
- Adaptive / inertia-based replanning
- Formal `reasoning_traces` (`roadmap_adjustment`)
