# 0016 — Goal Progress Explainability v1 (projection)

Status: Accepted
Date: 2026-07-21
Milestone: M19 (Sprint 19 — Goal Progress Explainability v1)

## Context

Decision and Roadmap Explainability (ADR-0014 / 0015) explain *why* work is
chosen and ordered. The remaining honesty gap is *where the founder is relative
to the active Goal*.

The glossary defines **Progress Score** as Mastery × `importance_weight` via
`skill_goal_relevance`. That relationship is not implemented (ADR-0002 / 0006).
Shipping a weighted percentage now would invent an unjustified scoring system.

Sprint 19 adds **Goal Progress Explainability**: a deterministic projection over
Goal + computed Roadmap (+ mastery already on roadmap steps). It does not
implement Progress Score.

## Decision

Add a Goal Progress Explainability subsystem that:

1. Defines **`GOAL_PROGRESS_EXPLANATION_VERSION`** independently of Planning,
   Decision, and Roadmap Explainability versions.
2. Pipelines **Goal → Roadmap Progress Facts → Goal Progress Explanation → UI**.
3. Represents progress primarily as a **qualitative roadmap stage**
   (`not_started` / `in_progress` / `path_complete` / `no_path`).
4. Lists completed, current, and remaining roadmap skills **without ranking**
   contributions toward the goal.
5. Treats remaining hours as **informational context only** — never as %
   completion.
6. Includes an explicit **measurement limits** statement that this is not
   overall goal readiness or weighted completion.

### Explainability vs Progress Score

| | Goal Progress Explainability (this ADR) | Progress Score (deferred) |
|---|---|---|
| Inputs | Goal + Roadmap step kinds / mastery on steps | Mastery × `importance_weight` via `skill_goal_relevance` |
| Output | Stage + unranked path lists + limits | Per-goal weighted aggregate |
| May invent weights? | No | Requires documented relevance join |

### Why weighted progress is deferred

Without `skill_goal_relevance`, any “% toward goal” or “contributed most”
ranking is speculative. Principle 9 and honesty require progress claims to reduce
to Skill Graph / Roadmap facts the system actually has. Weighted Progress Score
waits until that join exists.

### Why roadmap stage is the current proxy

Planning already projects the route to the Goal as a computed Roadmap
(ADR-0006). Stage (`completed` / `current` / `upcoming` structure) is an
observable property of that artifact. It answers “where am I on the current
path?” It must **not** be implied to equal overall goal completion or readiness.

### Why contribution rankings are intentionally omitted

“Most contributed” requires goal-relative weights. Until those exist, the UI
only presents completed / current / remaining roadmap skills as facts (with
mastery and confidence as distinct dimensions). Internal naming uses **Roadmap
Progress Facts** — the bare term “Progress Facts” is reserved for future
weighted models.

### Why forecasts remain out of scope

Predictive completion dates and probabilistic readiness belong to Prediction /
Risk Adjustment futures, not explainability. Remaining hours on the Roadmap are
presentation totals from Planning, not an ETA engine.

### Ownership

Explainability observes Goal + `getRoadmap` output. It must not call
`computeRoadmap` for a second ordering, must not modify mastery, and must not
alter recommendations.

## Consequences

- Dashboard shows a Goal progress panel with stage, path lists, hours context,
  and measurement limits.
- Progress Score, `skill_goal_relevance`, weighted completion, forecasting,
  adaptive planning, Mentor chat, and Claude remain deferred.

### Divergences / deferred (deliberate, not silent)

- Progress Score implementation
- `skill_goal_relevance` / importance weights
- Contribution ranking / “most valuable” completed skills
- Predictive readiness / completion dates
- Persisted progress history snapshots
