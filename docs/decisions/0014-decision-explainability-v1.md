# 0014 — Decision Explainability v1 (projection)

Status: Accepted
Date: 2026-07-21
Milestone: M17 (Sprint 17 — Decision Explainability v1)

## Context

CareerOS already persists deterministic skill recommendations with a full
factor breakdown (`skill_recommendations.factors`, ADR-0002). Guiding
Principles 11 and 17 require that recommendations be explainable as first-class
artifacts — not only inspectable in an engineering debug table.

Sprint 17 elevates those immutable decision facts into a **structured,
founder-facing explanation**. It does not change ranking, eligibility,
suppression, planning, or mastery. Claude prose and a formal `reasoning_traces`
table remain deferred.

## Decision

Add a Decision Explainability subsystem that:

1. Defines **`DECISION_EXPLANATION_VERSION`** independently of ranking policy.
2. Pipelines **Decision Factors → Explanation Facts → Decision Explanation → UI**.
3. Builds explanations **only** from the persisted `factors` snapshot on the
   recommendation row (plus goal title for goal-alignment wording).
4. Compares **winner vs runner-up only**.
5. Surfaces answers on the Recommendation card; keeps **DecisionInspector** as
   the engineering factor table.

### Explainability vs Decision

| | Decision Engine | Decision Explainability |
|---|---|---|
| Role | Select highest-value skill | Explain a recorded selection |
| Mutates ranking? | Yes (computes it) | Never |
| Source of truth | Live Skill Graph + factors | Persisted factor snapshot |

Explainability is a **projection**. It must not call `compareByFactors`, alter
candidate pools, or feed back into Planning/Suppression/Mastery.

### Why persisted snapshots are authoritative

Guiding Principle 11: the explanation for a recommendation is stored alongside
it, not regenerated inconsistently on demand. The factor JSON written at
recommendation time **is** that stored decision fact. Re-ranking “today” to
explain a past row would rewrite history whenever ontology or eligibility
changed. Historical UI therefore uses `skill_recommendations.factors` only.

Identical snapshot + `DECISION_EXPLANATION_VERSION` → identical explanation
(deterministic reconstruction, not LLM regeneration).

### Why explanation is projection-only

Storing a second mutable “explanation state” would duplicate judgment and drift
from the snapshot. Presentation (UI) stays separate from Explanation Facts and
from the builder’s declarative strings so copy can evolve via
`DECISION_EXPLANATION_VERSION` without touching ranking.

### Why runner-up comparison is sufficient

§7’s “why not another” requires a specific comparative reason, not a tour of the
pool. The lexicographic winner is fully determined by the first factor that
separates it from the runner-up (`deciding_factor_id`). Explaining arbitrary
lower ranks adds noise without changing the decision. Alternatives beyond
runner-up remain deferred.

### Why `reasoning_traces` remain deferred

Schema B.13 / AR-05 describe a multi-subject `reasoning_traces` table (task
recommendations, roadmap adjustments, mastery proposals). V1 skill
recommendations already carry immutable narrative + factors on
`skill_recommendations`. A separate table would be redundant until Export/Mentor
need multi-subject traces. Sprint 17 treats the recommendation row as the V1
trace substrate.

### Skill-adapted explainability questions

Docs §7 target Tasks. V1 answers Skill-adapted questions with declarative facts
and explicitly notes that Risk/Momentum are not ranking inputs yet — never
invents those reasons.

## Consequences

- Founder sees structured “why” on the recommendation surface.
- DecisionInspector remains for full candidate/factor debugging.
- Ranking, Roadmap, overrides, mastery unchanged.
- Claude explanations, conversational reasoning, `reasoning_traces` persistence,
  adaptive explanations, and Mentor chat remain deferred.

### Divergences / deferred (deliberate, not silent)

- Formal `reasoning_traces` table (B.13)
- Claude / LLM prose (AR-10)
- Mentoring chat grounded in traces
- Explaining non-runner-up candidates
- Risk/Opportunity Adjustment appearing inside ranking explanations
