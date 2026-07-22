# 0018 — Skill Relationship Explorer v1 (projection)

Status: Accepted
Date: 2026-07-21
Milestone: M21 (Sprint 21 — Skill Relationship Explorer v1)

## Context

The Skill Graph (ADR-0001) stores global ontology nodes/edges and a per-user
overlay. The Skill Tree inspector (Sprint 4) is an engineering canvas for the
full graph. Founders still lacked a **skill-centric** surface answering: what
are this skill’s direct prerequisites and unlocks, and (optionally) is it on
the current Roadmap?

Sprint 21 adds that surface as a **pure projection**. It does not edit the
graph, infer edges, recompute planning, or replace the Skill Tree.

## Decision

Add a Skill Relationship Explorer that:

1. Defines **`SKILL_RELATIONSHIP_EXPLORER_VERSION`** independently of Skill Graph
   schema, Planning, and Explainability versions.
2. Pipelines **Skill Graph → Graph Facts → Relationship Facts → Relationship
   View → UI**.
3. Limits exploration to **1-hop** (direct) relationships only.
4. Preserves full **edge identity** (parent key, child key, type,
   minimum mastery) in presentation.
5. Treats **Roadmap participation as optional enrichment** — the explorer works
   from the Skill Graph alone.
6. Keeps **SkillTreeInspector** as the engineering full-graph surface.

### Explorer vs Skill Tree

| | Skill Tree Inspector | Skill Relationship Explorer |
|---|---|---|
| Scope | Whole graph layout | One focus skill + direct neighbors |
| Audience | Engineering inspection | Founder relationship inspection |
| Mutates graph? | No | No |

### Explorer vs Planning

Planning owns sequencing and Roadmap computation (ADR-0006). The explorer may
*read* a computed Roadmap to show whether the focus skill is on the path and
the step’s existing `whyHere` / `blockedBy`. It must not call planning
internals to reorder or invent placement. Absence from the path is stated
honestly.

### Why one-hop relationships are sufficient for V1

Direct edges are the ontology’s explicit contracts. Transitive chains are
derivable later but invite analytics-style UI and implied “critical path”
narratives the product has not committed to. V1 answers “what touches this
node?” without graph scoring.

### Why roadmap participation is contextual

Relationship truth lives on Skill Graph edges. The Roadmap is a computed route
(AR-01), not the dependency store. Making Roadmap required would couple
inspection to Planning availability and blur ownership. Optional context keeps
the explorer correct when only the graph is loaded.

### Why inferred edges are intentionally omitted

Inferring dependencies (e.g. soft→hard promotion, transitive shortcuts) would
create a second graph that drifts from ontology provenance. Only recorded
`skill_dependencies` rows appear.

### Ownership

- **Skill Graph:** nodes, edges, overlay.
- **Explorer:** relationship presentation, navigation, inspection.

## Consequences

- Dashboard shows a skill picker with hard/soft prerequisites and unlocks.
- No migration; no ontology authoring; no analytics.
- Transitive traversal, graph editing, dependency scoring, AI explanations,
  and ontology authoring remain deferred.

### Divergences / deferred (deliberate, not silent)

- Transitive dependency views / critical-path UI
- Graph analytics (centrality, clustering)
- Graph editing / ontology authoring
- Dependency scoring
- AI relationship narratives
- Dedicated `/skills` route (V1 uses dashboard panel)
