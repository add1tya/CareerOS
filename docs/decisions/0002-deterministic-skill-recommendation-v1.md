# 0002 — Deterministic skill recommendation (Decision Engine v1)

Status: Accepted
Date: 2026-07-16
Milestone: M5 (Sprint 5 — Decision Engine v1)

## Context

CareerOS must answer one question: "What is the single highest-value skill the
user should learn next, and why?" `career-intelligence-engine.md` and
`task-generation-engine.md` describe a rich Decision/Recommendation Engine, but
Sprint 5 is deliberately minimal: deterministic, no AI, and it recommends a
**Skill**, not a Task (Tasks/Missions/Evidence do not exist yet).

`task-generation-engine.md` §6.2 is explicit that scoring must not use invented
numeric coefficients; it prescribes a "gated multi-factor sort" (primary factors
gate, secondary factors break ties).

## Decision

**Recommend a Skill, ranked by a deterministic lexicographic comparator** over
an ordered set of documented factors — no weighted sums, no invented
coefficients. Every factor is an ordinal already present in the ontology or
derived by counting graph edges.

Factor order (priority high → low):

1. **Goal impact** — `ontology_category` tier (core → advanced → specialization
   → future). *Documented proxy* for `importance_weight` (see divergence below).
2. **Dependency unlock value** — count of skills that list the candidate as a
   **hard** prerequisite (direct hard-children count).
3. **Estimated effort** — `estimated_hours_min` (secondary tie-breaker).
4. **Transferability** — ordinal (secondary tie-breaker).
5. **Stable ontology order** — `display_order` (guarantees a total order →
   deterministic, stable winner).

Candidate pool = **available skills only** (`status = 'available'`).

### Deterministic confidence (not AI confidence)

A `RecommendationConfidence` enum (`LOW`/`MEDIUM`/`HIGH`/`VERY_HIGH`) is derived
purely from *which* factor first separated the winner from the runner-up:
primary factor (goal_impact → VERY_HIGH, dependency_unlock → HIGH), secondary
(estimated_effort → MEDIUM), weak tie-breaker (transferability/stable_order →
LOW); a sole candidate → VERY_HIGH. No numbers are invented.

### Extensible factors module

Factors live in a dedicated `factors.ts` as ordered descriptors. Adding or
reordering a factor (e.g. a future `skill_goal_relevance` importance_weight or
deadline pressure) changes ranking without touching the engine's comparison
logic.

### Persistence

`skill_recommendations` is an **append-only decision history** (immutable at
write, AR-05/AR-15; select/insert own only, no update/delete). Each row stores
the recommended skill, goal, narrative, deterministic confidence, and the **full
ranking factor breakdown** (winner + every candidate) as JSON for debugging and
future evaluation. Write-on-change: a new row is appended only when the
recommended skill differs from the latest (Recommendation Stability,
task-generation-engine.md §9).

## Consequences

- The recommendation is fully deterministic, stable, and auditable end-to-end.
- Two internal, non-user-facing debugging surfaces exist: the Skill Graph
  inspector (M4) and the Decision Engine Inspector (this sprint), the latter
  showing every candidate and its per-factor values.

### Divergences (deliberate, not silent)

- **Skill, not Task.** The doc's finest-grained output is a Task; V1 recommends
  a Skill because Tasks/Evidence are out of scope until later milestones.
- **`ontology_category` as Goal-impact proxy.** The canonical factor is
  `importance_weight` via the `skill_goal_relevance` relationship, which is not
  yet modeled. `ontology_category` is the documented sequencing-weight prior
  (skill-graph-schema.md §2) used until that relationship exists.
- **Direct hard-children count** as the unlock-value measure (a documented
  proxy); a transitive newly-unlockable measure is a future refinement.

### Deferred (unchanged intent)

Risk/Opportunity adjustment stages, deadline-pressure scaling, learning
velocity, confidence decay, evidence, tasks, and threshold calibration.
