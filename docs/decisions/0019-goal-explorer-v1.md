# 0019 — Goal Explorer v1 (projection)

Status: Accepted
Date: 2026-07-22
Milestone: M22 (Sprint 22 — Goal Explorer v1)

## Context

Skill Relationship Explorer (ADR-0018) inspects one skill. Goal Progress
Explainability (ADR-0016) narrates **roadmap-stage** progress. Founders still
lacked a **goal-centric dossier**: the Goal row’s identity, recorded
Constraints, and an honest inventory of skills associated via the **Current
Roadmap** — without editing goals or inventing `skill_goal_relevance`.

Sprint 22 adds that inspection surface as a pure projection.

## Decision

Add a Goal Explorer that:

1. Defines **`GOAL_EXPLORER_VERSION`** independently of Goal schema, Goal
   Progress Explainability, and Planning.
2. Pipelines **Goal → Goal Facts → Goal Context → Goal Path Facts → View → UI**.
3. Always preserves **goal id, title, source, created timestamp, status**.
4. Treats **Roadmap as optional enrichment**; Goal + Constraints alone are
   sufficient.
5. Labels path sections **Current Roadmap** (not bare “Roadmap”) to separate
   planning context from goal definition.
6. Remains **inspection**, not planning or editing.

### Goal Explorer vs Goal Progress Explainability

| | Goal Explorer (this ADR) | Goal Progress Explainability (ADR-0016) |
|---|---|---|
| Focus | Goal dossier (metadata, constraints, path inventory) | Qualitative roadmap **stage** narrative |
| Primary question | What is my goal and what is on record? | Where am I on the path? |
| Edits / scores? | No | No |

Both stay; they answer different questions.

### Goal Explorer vs Planning

Planning owns the Current Roadmap path. The explorer may *read* that path to
list completed / current / remaining skills and remaining hours as context. It
must not recompute ordering or treat path membership as goal requirements.

### Why roadmap skills are not goal requirements

Canonical requirements live on `skill_goal_relevance` (schema §2.1). That join
is unimplemented. Listing Roadmap steps as “required skills” would falsely
elevate a computed route into ontology truth. V1 labels them as **Current
Roadmap** path associations only.

### Why `skill_goal_relevance` remains deferred

Implementing it is a domain-model sprint (weights, multi-goal aggregation
OQ-02), not an inspection UI. Explorer must not invent weights or requirement
sets to look complete.

### Why Goal Explorer is inspection rather than planning

Editing goals or constraints would trigger Planning recomputation semantics and
expand scope into goal management. This sprint only presents recorded facts.

### Ownership

- **Goal:** metadata, lifecycle.
- **Constraints:** recorded bounds (shown as Goal Context).
- **Roadmap / Planning:** path.
- **Explorer:** presentation and inspection.

## Consequences

- Dashboard shows Goal Explorer alongside Goal Progress.
- No migration; no goal editor; no Progress Score.
- Multi-goal UI, analytics, AI summaries, and requirement inference remain
  deferred.

### Divergences / deferred (deliberate, not silent)

- Goal editing / multi-goal Goal Graph
- `skill_goal_relevance` / Progress Score
- Full Constraint Model fields not in V1 schema
- Analytics / AI summaries
- Inferring required skills from ontology without a join
