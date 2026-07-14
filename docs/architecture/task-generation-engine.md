# The Task Generation Engine

Status: Foundational architecture document. Implementation contract for the Decision Engine's finest-grained output — the actual daily recommendation surfaced to the user.

Source-of-truth documents this design implements: `docs/product/*`, `docs/architecture/career-intelligence-engine.md`, `docs/domain/ai-engineering-knowledge-model.md`, `docs/domain/skill-graph-schema.md`, `docs/product/onboarding-intelligence.md`. Contradictions or gaps found relative to those documents are called out in §13 (Suggested Revisions), not silently resolved.

**Governing bias for every design choice in this document, stated once here rather than repeated at each section:** wherever a more sophisticated mechanism is considered, the question asked first is whether a simpler, deterministic approach reaches roughly 80% of the value for V1. The simpler approach is preferred unless a specific, stated reason justifies the added complexity. This is not a new principle — it is Guiding Principle 7 ("no unnecessary complexity") applied concretely to every mechanism in this engine — but it is restated explicitly because this document is the one most likely to accumulate unjustified sophistication over time if that discipline isn't kept visible.

**Terminology note:** the architecture document (`career-intelligence-engine.md` §4.9) names this capability the **Recommendation Engine**, also referred to there as the Daily Task Engine at its finest grain. This document uses **Task Generation Engine** as requested for the file's purpose, and treats it as identical to the Recommendation Engine — not a sixth new engine alongside the eight already defined. See §13 for a recommendation to converge on one name.

---

## 1. Purpose

The Task Generation Engine answers exactly one question, asked fresh every time it runs: **given everything currently known about this user, what is the single most valuable thing they could do right now, and why?**

It exists because this question cannot be answered by a static plan. Per `career-intelligence-engine.md` §1, CareerOS behaves like a routing engine, not a curriculum server — the Roadmap is a computed mid-range view, and this engine is what computes the finest-grained, most time-sensitive point on that route: the actual next action, evaluated against *today's* real constraints, not last month's plan.

**Relationship to the Decision Engine:** the Task Generation Engine is not a peer of the Decision Engine — it is the Decision Engine's most frequently invoked mode (`career-intelligence-engine.md` §4.9), specialized for the finest time grain (today's available hours) as opposed to the Planning Engine's mid-range Mission/Quest sequencing. It consumes the Planning Engine's current near-term Roadmap slice as one of its inputs; it does not independently re-derive the Roadmap on every call (§4 explains why this separation of concerns matters operationally, not just conceptually).

The problem this solves, stated plainly: without it, a user has a Skill Graph full of structured knowledge and a Roadmap full of Missions, but no answer to the only question that actually determines whether today was productive. Every other document in this repository describes what CareerOS *knows*. This document describes what CareerOS *tells the user to do about it, right now* — the point where all the modeling becomes a single, concrete, defensible action.

---

## 2. Inputs

Each input is listed with the specific reasoning failure its absence would cause — consistent with the evidentiary discipline used throughout `ai-engineering-knowledge-model.md` and `onboarding-intelligence.md`.

| Input | Source | Why It Matters Here Specifically |
|---|---|---|
| **Career Graph** | Persisted state | The umbrella structure; supplies the Goal Model and overall context the engine reasons within. |
| **Skill Graph** (nodes, `mastery`, `confidence`, `status`) | Persisted state, per `skill-graph-schema.md` | The terrain — without current Mastery/Confidence per node, the engine cannot distinguish a genuinely valuable Task from one that's already redundant or premature. |
| **Dependency Edges** | Skill Graph schema | Determines which Skills are structurally eligible (`available` or better) right now — a Task targeting a `locked` Skill is not a valid candidate, full stop, regardless of how well it would otherwise score. |
| **Goals** (incl. Goal Graph weighting) | Career Graph | Without a destination, "highest expected-value" has no basis for comparison — this is the reference frame every other input is scored against. |
| **Constraints** (weekly hours pattern) | Constraint Model | Bounds the *type* and *size* of Task that can be honestly recommended — a well-ranked Task that doesn't fit available time is not a valid recommendation, only a valid candidate for a different day. |
| **Available time today specifically** | Derived from Constraint Model, adjustable by direct user input for the day | Distinct from the general weekly pattern — today's actual available hours may differ from the typical pattern (Onboarding Q8's seasonal-variance answer, or a same-day user-stated adjustment), and this is the figure that actually bounds today's Task size, not the general weekly average. |
| **Evidence history** | Skill Graph schema | Needed to avoid re-recommending something already well-evidenced, and to identify which Skills have gone the longest without fresh Evidence (relevant to both Confidence decay and to varied practice). |
| **Mastery** (per relevant node) | Skill Graph | The primary determinant of how far a Skill is from its next meaningful threshold — Task selection is largely about closing the highest-value remaining gap. |
| **Confidence** (per relevant node) | Skill Graph | Low-Confidence, higher-`mastery` nodes are reasonable candidates for verification-oriented Tasks (ones that would raise Confidence via stronger Evidence) even when raw Mastery isn't the lowest in the graph — Confidence and Mastery are independent axes and both drive candidate selection, not just Mastery. |
| **Learning Velocity** | Computed from History (`career-intelligence-engine.md` §3.9/§4.8) | Informs realistic sizing of a recommended Task's expected duration and difficulty against this specific user's actual demonstrated pace, not the ontology's generic Estimated Mastery Time. |
| **Momentum** | User State | Modulates Task *size and framing* (smaller, more achievable Tasks during a low-Momentum period), never the underlying priority ranking itself — this distinction is restated from the architecture document (§3.9) because it is easy to conflate "what's highest value" with "what's easiest to do right now," and this engine must keep them distinct. |
| **Reflection history** | Reflection Engine outputs | Surfaces qualitative context (stated preferences, frustrations, confirmed misunderstandings) that structured Skill Graph fields alone can't capture — e.g., a Reflection noting a specific Skill "felt disconnected from the actual goal" is a signal this engine should weigh even though it isn't a numeric input. |
| **Recovery status** | Recovery Engine | If the user is currently in a Recovery state (a broken Streak or backlog per `career-intelligence-engine.md` §4.5), this changes both the candidate pool (favor re-engagement-appropriate Tasks) and the framing of the Reasoning Trace — handled formally in §8. |
| **Risk Model** | Risk Engine | Surfaces pace/scope/burnout risk; when risk is elevated, this biases selection toward risk-mitigating Tasks (§6) over purely opportunistic ones. |
| **Opportunity Model** | Opportunity Engine | Rare, high-signal input (per `career-intelligence-engine.md` §4.10's deliberately narrow V1 scope) — when active, may inject a candidate Task outside the default Roadmap path; absent in the overwhelming majority of invocations. |
| **Calendar** (future) | Not implemented in V1 | Would corroborate stated available time against actual free time; explicitly deferred (`onboarding-intelligence.md` §23) — not a required input for V1's decision pipeline. |
| **User overrides** | Task/recommendation history | Prior instances of the user rejecting or substituting a recommended Task are a direct signal about a possible model gap (Guiding Principle 18) and should suppress recommending near-identical candidates without a materially different justification. |
| **Energy level** (future) | Not implemented in V1 | Distinct from Momentum (a trend signal) — a real-time state input, deferred until there's a low-friction way to collect it without adding onboarding/interaction burden disproportionate to its V1 value. |

---

## 3. Output

The engine produces exactly one structured object per invocation, defined precisely so two independent implementations converge on the same shape:

| Field | Description |
|---|---|
| **Recommended Task** | The single top-ranked Task: a Task ID (or newly generated candidate, per §5), a title, and a description grounded in a specific Skill Graph gap. |
| **Reasoning Trace** | The stored explanation (per `career-intelligence-engine.md` §3.7) — which Skill gap, which Goal, which specific inputs from §2 materially influenced the ranking. Never regenerated after the fact; written once, at recommendation time, and persisted. |
| **Expected Duration** | A time estimate for completing the Task, derived from the target Skill's `estimated_hours` (ontology prior) adjusted by this user's observed Learning Velocity — always presented as a range, not a false-precision point value. |
| **Priority Score** | The engine's internal ranking value for this Task relative to the candidates it was compared against (§6) — exposed for auditability and debugging, not necessarily surfaced prominently in any consuming UI. |
| **Confidence Score** | How confident the engine is that this is genuinely the correct top recommendation, distinct from Priority Score — a close race between the top two candidates should produce a lower Confidence Score even if the Priority Score itself is high, per the same confidence-composition discipline used throughout the Skill Graph schema. |
| **Alternative Tasks** | The next 2–3 ranked candidates, each with their own (abbreviated) Reasoning Trace — required for explainability (§7) and to give the user genuine choice, not just a single directive. |
| **Why Rejected Tasks Were Not Selected** | For each Alternative Task specifically (not the full candidate pool), a short, honest comparative statement — e.g., "ranked slightly below the top pick because it doesn't unlock any new Dependencies yet" — never a vague "less optimal," always a specific, named reason. |
| **Required Skills** | The Skill node(s) this Task directly targets, referenced by `skill_key`, so the recommendation is traceable back to the Skill Graph precisely. |
| **Expected Mastery Gain** | A projected `mastery` delta for the targeted Skill(s) if the Task is completed as scoped, computed the same way the actual post-completion update would be computed (§5.6 of the schema) — stated as an expectation, never a guarantee, and always paired with the Evidence Type below. |
| **Evidence Type** | Which Evidence tier (`skill-graph-schema.md` §6–7) completing this Task would produce — e.g., a Task scoped as "watch and summarize X" produces at best Tier 2 evidence, while "build and ship X" produces Tier 3, and this distinction should visibly influence which Task is prioritized when multiple candidates target the same Skill gap (§6). |

---

## 4. Decision Pipeline

```
   ┌─────────┐    ┌───────────────┐    ┌───────────────────┐    ┌──────────────────────┐
   │ OBSERVE │───▶│ UPDATE USER   │───▶│ IDENTIFY SKILL GAPS│───▶│ EVALUATE DEPENDENCIES │
   └─────────┘    │    STATE      │    └───────────────────┘    └───────────┬───────────┘
                   └───────────────┘                                        │
                                                                              ▼
   ┌─────────────────────┐    ┌──────────────────────┐    ┌───────────────────────┐
   │ FILTER IMPOSSIBLE    │◀───│ GENERATE CANDIDATE    │◀───│  (from EVALUATE        │
   │      TASKS           │    │       TASKS            │    │   DEPENDENCIES)        │
   └──────────┬───────────┘    └──────────────────────┘    └───────────────────────┘
              ▼
   ┌─────────────────┐    ┌──────────────────┐    ┌────────────────────┐
   │ SCORE CANDIDATES │───▶│  RISK ADJUSTMENT  │───▶│ OPPORTUNITY        │
   └─────────────────┘    └──────────────────┘    │  ADJUSTMENT         │
                                                     └──────────┬─────────┘
                                                                ▼
   ┌──────────────────────────┐    ┌───────────────────────┐    ┌───────────────────────┐
   │ SELECT HIGHEST EXPECTED   │───▶│  GENERATE REASONING    │───▶│ PRESENT RECOMMENDATION │
   │        VALUE              │    │       TRACE             │    └───────────────────────┘
   └──────────────────────────┘    └───────────────────────┘
```

**Observe.** Raw signal since the last invocation is pulled in: new Evidence, elapsed time (for decay), any explicit user input for today (available hours, a stated override). No scoring or interpretation happens at this stage — pure ingestion, mirroring the architecture document's Decision Loop Observe stage at this engine's finer grain.

**Update User State.** Momentum and current Confidence-decay projections (per `skill-graph-schema.md` §5.3) are recomputed against the current timestamp — this must happen before gap identification, since a node's effective Confidence (and therefore whether it reads as needing attention) depends on how much time has elapsed, not just its last-stored value.

**Identify Skill Gaps.** The engine scans the Skill Graph for nodes that are both Goal-relevant (via the `skill_goal_relevance` relationship, `skill-graph-schema.md` §2.1) and below a meaningful Mastery or Confidence threshold — this produces a *broad* candidate region, not yet actual Tasks. A gap can be a low-Mastery node (needs building) or a Mastery-adequate-but-low-Confidence node (needs verification) — both are legitimate gap types, and conflating them would bias the engine toward always recommending new material over verifying existing claims.

**Evaluate Dependencies.** Every gap identified is checked against Hard Dependency edges (`skill-graph-schema.md` §3.1) — a gap on a `locked` node is not eligible; a gap on a node whose Hard Dependencies are only just barely satisfied is eligible but flagged as lower-confidence-appropriate (favor smaller, foundational-reinforcing Tasks over ambitious ones on freshly-unlocked nodes).

**Generate Candidate Tasks.** For each eligible gap, one or more concrete Task candidates are produced. This is the stage with the most implementation-strategy latitude — covered in full in §5.

**Filter Impossible Tasks.** Candidates are removed if they cannot fit today's actual available time (§2), require tools/access the user doesn't have, or duplicate a Task the user has already explicitly overridden/rejected recently without a materially changed justification (§2, User overrides). This is a hard filter, not a scoring penalty — an impossible Task should never appear even as a low-ranked Alternative.

**Score Candidates.** The remaining candidates are scored per §6.

**Risk Adjustment.** If the Risk Model indicates elevated pace, scope, or burnout risk, scores are adjusted to favor Tasks that directly mitigate the specific risk type detected (e.g., pace risk favors higher-Mastery-Gain-per-hour Tasks; burnout risk favors smaller, lower-friction Tasks even at some cost to raw priority) — this is a deliberate, explainable adjustment layer, not a silent reweighting buried inside the base score.

**Opportunity Adjustment.** In the rare case the Opportunity Model has an active, high-Confidence signal (§2), a candidate reflecting that opportunity may be injected or boosted at this stage — kept as a distinct, late-pipeline step specifically so its rarity and its reasoning remain visible and auditable, rather than blended invisibly into the base scoring formula.

**Select Highest Expected Value.** The top-scored candidate after all adjustments becomes the Recommended Task; the next 2–3 become Alternative Tasks (§3).

**Generate Reasoning Trace.** Constructed from the specific inputs and adjustments that produced the final ranking — not a generic template, but a trace that would actually change if a specific input had been different, which is the practical test for whether a Reasoning Trace is genuinely grounded versus decorative.

**Present Recommendation.** The completed output object (§3) is returned and persisted (never only transiently computed and discarded — the Reasoning Trace must be queryable later, per `skill-graph-schema.md` §9.6's auditability requirement).

---

## 5. Candidate Task Generation

Three plausible mechanisms exist for producing concrete Task candidates from an identified Skill gap. Applying this document's governing bias (§0/header): the simplest deterministic option is the default, and each step up in sophistication must earn its place.

### 5.1 Template Library (default for V1)
A curated, hand-authored library of Task templates per ontology domain, seeded directly from each domain's "Suggested Projects" field in `ai-engineering-knowledge-model.md`, parameterized by current Mastery level (a low-Mastery template differs from a near-Mastery template for the same Skill) and by Learning Profile (a build-first template variant versus a study-first variant, per `onboarding-intelligence.md` §3.5).

- **Tradeoff:** Requires upfront authoring effort per domain, and coverage is only as good as the template library's breadth. But it is fully deterministic, fully explainable (a template's provenance is always traceable to a specific ontology entry), cheap to run, and trivially debuggable when a recommendation looks wrong.
- **This is the V1 default**, precisely because it achieves the large majority of the value (concrete, relevant, actionable Task candidates) without any of the risk profile of generative candidate creation (§5.2).

### 5.2 LLM-Generated Candidates
The Claude API generates novel Task candidates directly from the Skill gap description and user context, without a template constraining the output shape.

- **Tradeoff:** Higher flexibility and personalization ceiling — can produce a Task tailored to specifics a template library couldn't anticipate (e.g., referencing the user's own prior project from Evidence history). But materially harder to make deterministic, harder to guarantee falls within Filter Impossible Tasks' constraints without a second validation pass, and harder to keep the Reasoning Trace genuinely grounded rather than plausible-sounding-but-ungrounded (a known LLM failure mode this entire architecture is designed to guard against, per the Decision Engine's explainability commitments).
- **Not the V1 default.** Reserved for a later phase, once the Template Library's coverage gaps are empirically well-understood — using generative candidate creation to fill *specific, identified* gaps in a working deterministic system is a materially lower-risk adoption path than making it the primary mechanism from day one.

### 5.3 Hybrid (the actual V1 approach)
The Template Library (§5.1) generates the base candidate pool deterministically. The Claude API is used narrowly, only to **personalize the phrasing and specific parameters** of a template-selected candidate (e.g., filling in the user's own prior project or stated interests into an otherwise fixed template structure) — never to invent the candidate's existence or its targeted Skill gap from scratch.

- This is the actual V1 mechanism: deterministic selection of *what* gap to address and *which* template applies, with a narrow, bounded LLM call for *how it's worded* to this specific user. This keeps the highest-risk part of the pipeline (deciding what to recommend and why) fully deterministic and auditable, while still getting real personalization value from the Claude API where the risk of ungrounded output is low (wording, not substance).

### 5.4 Knowledge Model / Projects as the Underlying Content Source
Regardless of mechanism (5.1–5.3), the actual content Task candidates draw from is always the ontology's "Suggested Projects" field and the Skill's general shape — the Task Generation Engine does not invent new project ideas independent of `ai-engineering-knowledge-model.md`; it selects, scopes, and sequences from that existing content source. This keeps the entire candidate-generation surface traceable back to a single, versioned, human-reviewed content source rather than an unbounded generative space.

---

## 6. Scoring Model

Consistent with the task brief's instruction and this document's governing bias, this section defines the *factors* and *weighting philosophy* a scoring formula must respect — not specific numeric weights, which would be premature, unjustified precision at this stage (exactly the kind of invented-number complexity the governing bias warns against).

### 6.1 Scoring Factors

| Factor | Direction of Influence | Why It Belongs |
|---|---|---|
| **Goal impact** | Higher `importance_weight` (via Goal-relevance, `skill-graph-schema.md` §2.1) → higher score | The single most fundamental factor — a Task that doesn't serve an active Goal has no basis for being recommended at all, regardless of its other properties. |
| **Dependency unlock value** | A Task on a node that is itself a Hard Dependency for multiple currently-`locked` downstream nodes scores higher than one that unlocks nothing further | Directly implements the Recommendation Engine principle already stated in the architecture document (§4.9): unblocking future options is real value, not just immediate Mastery gain. |
| **Estimated effort** | Fit against today's actual available time (§2) is a hard filter, not a scoring input; *within* the feasible set, effort is a secondary tie-breaker, not a primary driver | Prevents the scoring model from systematically favoring trivially small Tasks just because they're cheap — cost should shape feasibility, not dominate value. |
| **Learning velocity** | Tasks sized consistently with the user's actual demonstrated pace score higher than those requiring an implausible pace jump | Keeps recommendations grounded in reality rather than the ontology's generic estimate, per §2's Learning Velocity input. |
| **Knowledge retention / Skill decay** | A node with high `mastery` but decaying `confidence` (per schema §5.3) gains a moderate score boost for verification-type Tasks | Directly operationalizes the schema's Confidence-decay design — decay exists specifically so this engine has a reason to occasionally recommend revisiting older material, not just always pushing forward. |
| **Portfolio value** | Tasks producing Tier 3 (Project) or higher Evidence (schema §7) score a moderate boost over otherwise-equal Tasks producing only Tier 1/2 Evidence | Directly implements the "build to learn" philosophy (`product-philosophy.md` §10) as a scoring-level preference, not just a content-generation-level default. |
| **Motivation** | Candidates aligned with recent Reflection-stated preferences or interests score a modest boost | A genuine but intentionally secondary factor — motivation should break ties and add texture, not override Goal impact or Dependency logic, consistent with the Honesty-over-comfort principle (`product-philosophy.md` §11). |
| **Time available (today)** | Hard filter (§4, Filter Impossible Tasks), not a scoring factor | Restated here to be explicit that "more time available" should never be read as "recommend a bigger Task than the gap actually calls for" — fit, not maximization, is the goal. |
| **Deadline pressure** | Scales the weight given to Goal impact and pace-relevant factors upward as a stated Deadline (Goal Model) approaches, without introducing panic-driven Task selection | Implements urgency without abandoning the underlying ranking logic — a near deadline should sharpen prioritization, not replace it with a different, less grounded logic. |
| **Confidence** | Low overall Confidence in the current gap assessment (e.g., sparse Evidence) modestly favors broadly-diagnostic Task candidates over narrowly-optimized ones | Directly extends `onboarding-intelligence.md` §22's failure-case handling into ongoing operation, not just the first Onboarding session. |
| **Risk** | Applied at the Risk Adjustment pipeline stage (§4), not blended into the base score | Kept as a distinct, visible adjustment layer for the same auditability reason as Opportunity Adjustment — risk-driven reprioritization should be traceable as its own step in the Reasoning Trace, not invisible inside a single combined number. |
| **Opportunity** | Applied at the Opportunity Adjustment pipeline stage (§4) | Same reasoning as Risk — kept separate and rare by design. |

### 6.2 Weighting Philosophy

Three principles govern how these factors combine, deliberately stated as principles rather than a formula with invented coefficients:

1. **Goal impact and Dependency unlock value are primary; everything else is secondary.** A Task with strong Goal relevance and strong unlock value should not be displaced by a Task that merely scores well on secondary factors like Motivation or Portfolio value. The scoring model should be structured (e.g., as a primary-factor gate followed by secondary-factor tie-breaking within a roughly comparable primary-factor band) rather than as a single flat weighted sum where a secondary factor could mathematically overwhelm a primary one through sheer number of contributing terms.
2. **Hard filters happen before scoring, not inside it.** Feasibility (time, dependency status, tool access) is binary and belongs in Filter Impossible Tasks (§4). Encoding feasibility as a heavily-weighted scoring factor instead of a filter risks a large-effort-but-otherwise-perfect Task narrowly outscoring a feasible one, only to then fail the presented-recommendation's basic usability — this is a correctness requirement, not a style preference.
3. **Adjustments (Risk, Opportunity) are visible pipeline stages, not hidden coefficients.** Per §4 and repeated here: any factor whose activation is rare or context-dependent (Risk elevation, an Opportunity signal) is applied as a distinct, separately-reasoned adjustment step, specifically so the Reasoning Trace can say "this was reprioritized due to elevated pace risk" rather than the user only seeing an unexplained score shift.

The specific numeric implementation (a weighted sum, a gated multi-factor sort, or another structure satisfying the three principles above) is left to implementation, consistent with this document's role as a reasoning specification, not a formula specification — see §12, Open Questions.

---

## 7. Explainability

Every Recommended Task's Reasoning Trace must answer five questions, each mapped directly to specific pipeline stages and output fields defined above:

- **"Why this task?"** — Answered by the Skill Gap and Dependency evaluation stages (§4), and the Required Skills / Expected Mastery Gain output fields (§3): the Task targets a specific, named gap.
- **"Why now?"** — Answered by the combination of Learning Velocity, Momentum, Risk Adjustment, and today's actual available time (§2, §4): the Task fits both the user's current capacity and the current state of urgency/risk, not just the abstract Skill Graph.
- **"Why not another task?"** — Answered directly by the "Why Rejected Tasks Were Not Selected" output field (§3), which must name the specific comparative reason for each surfaced Alternative, never a generic "this one scored higher."
- **"What happens if I skip it?"** — Not a separately-computed field, but derivable on demand by the Mentor Engine from the same Decision Context (per `career-intelligence-engine.md` §4.6) — e.g., whether skipping delays a Dependency unlock, extends the current Roadmap timeline, or has negligible near-term effect, stated honestly rather than inflated to manufacture urgency (`product-philosophy.md` §9's prohibition on manufactured urgency applies directly here).
- **"How does it help my long-term goal?"** — Answered by tracing the Required Skill(s) through the `skill_goal_relevance` relationship (`skill-graph-schema.md` §2.1) back to the active Goal(s) it serves, stated in the Reasoning Trace in plain language, not merely implied by the presence of a Priority Score.

A Reasoning Trace that cannot answer all five when asked is treated as a defect, not an acceptable simplification — this is the direct operational test for Guiding Principle 17 (everything explainable) as applied to this specific engine.

---

## 8. Recovery Logic

Each scenario below specifies how the Task Generation Engine's behavior changes, distinct from (but coordinated with) the Recovery Engine's own broader role (`career-intelligence-engine.md` §4.5):

- **The task is skipped (once).** No special handling — the next invocation simply re-runs the full pipeline against current state; a single skip is ordinary variance, not a Recovery-triggering event, consistent with §9's stability discussion below.
- **The user has no time (today).** The Filter Impossible Tasks stage (§4) naturally produces a smaller or zero-duration-appropriate candidate set; if genuinely zero time is available, the engine should be capable of recommending a near-zero-effort action (e.g., a two-minute Reflection prompt) rather than returning no recommendation at all — an empty response is a worse user experience than an honestly small one.
- **The user disappears for two weeks.** This crosses into Recovery Engine territory (`career-intelligence-engine.md` §4.5) — on the next invocation after a detected long gap, the Task Generation Engine defers its normal pipeline and instead requests a Recovery Engine pass first, which recomputes near-term plan assumptions (the gap is new Constraint information, not a failure) before generating a fresh recommendation; the resulting Task should explicitly favor low-friction re-engagement over resuming exactly where the Roadmap left off at full intensity.
- **A goal changes.** The engine does not attempt to reconcile this locally — a changed Goal invalidates the current Goal-relevance weightings (§6.1) system-wide, so this triggers a Planning Engine re-invocation (full Roadmap recomputation) before the Task Generation Engine runs again, rather than the Task Generation Engine trying to patch around a stale Roadmap slice.
- **Weekly hours change.** Handled locally by the Task Generation Engine alone if the change is within the Constraint Model's already-known seasonal variance (Onboarding Q8); handled by triggering Planning Engine recomputation if the change is a genuine, sustained shift outside prior variance — the materiality threshold here mirrors §9's general stability discussion.
- **New opportunities appear.** Routed through the Opportunity Adjustment pipeline stage (§4) as designed — the Task Generation Engine does not independently detect opportunities; it only consumes the Opportunity Engine's output when active.

---

## 9. Recommendation Stability

Per `career-intelligence-engine.md` §6's general principle, applied concretely here: the Task Generation Engine must not oscillate between meaningfully different recommendations across trivially different invocations (e.g., re-running it five minutes apart with no new Evidence should produce the same Recommended Task).

**When recommendations should remain stable:** across invocations where no new Evidence, no Constraint change, and no elapsed-time-driven decay crossing a meaningful threshold has occurred. In practice, this means the engine should be effectively idempotent given identical input state — the same Career Graph snapshot should deterministically produce the same recommendation, which is itself a strong argument for §5's Template Library + narrow-LLM-personalization approach over a less deterministic full-generative approach: determinism given fixed input is a correctness property this engine needs, not merely a nice-to-have.

**When recommendations should change:** when genuinely new Evidence has been recorded (a real state change), when a meaningful amount of time has passed such that Confidence decay has crossed a relevant threshold for the currently-recommended Skill specifically, or when an explicit user action (an override, a stated Constraint change) has occurred.

**Materiality thresholds, discussed conceptually (no specific numeric values specified here, consistent with §6.2's stance on premature precision):** the engine should distinguish between *routine variance* (a single day's Momentum fluctuation, a small amount of elapsed time) and *materially new information* (completed Evidence, a multi-week gap, an explicit Constraint change). The former should never trigger a different Recommended Task; the latter should. Where this document does not specify the exact threshold (e.g., how many elapsed days before Confidence decay is "material" for a specific Skill), that is intentionally deferred to calibration against real usage, per the same reasoning already applied to Dependency thresholds in `skill-graph-schema.md` §11.

This stability requirement is what prevents the Task Generation Engine from feeling erratic despite genuinely recomputing fresh on every invocation (per the core routing-engine mental model) — freshness of computation and stability of output are not in tension as long as the engine is honest about what does and doesn't count as new information.

---

## 10. V1 Simplification

Applying this document's governing bias explicitly, section by section:

**Implemented first, fully deterministic (rule-based), no Claude API involvement:**
- Identify Skill Gaps, Evaluate Dependencies, Filter Impossible Tasks — pure Skill Graph queries against stored state, no reasoning-model call needed or justified.
- The core scoring model (§6) — a deterministic formula respecting the stated weighting principles, not a learned or LLM-driven scoring pass. Scoring is exactly the kind of decision where determinism, debuggability, and the Confidence-composition discipline matter more than generative flexibility.
- Recommendation Stability enforcement (§9) — must be deterministic by construction, since a non-deterministic component here would directly undermine the stability guarantee.

**Implemented with narrow, bounded Claude API use:**
- Candidate Task personalization (§5.3) — filling template parameters with user-specific detail (referencing a prior project, adjusting phrasing to the user's Learning Profile) is a well-bounded, low-risk use of the Claude API, since the underlying candidate's existence and target gap were already determined deterministically.
- Reasoning Trace prose generation — the *structure* of the Reasoning Trace (which factors, which comparisons) is fully determined by the pipeline; Claude may be used only to render that already-determined structure into clear natural language, not to decide its content.

**Explicitly rule-based, deferred sophistication:**
- Risk Adjustment and Opportunity Adjustment (§4) — implemented in V1 as simple, explicit rule checks against the Risk Model / Opportunity Model outputs (e.g., "if pace risk is flagged, apply a fixed modest boost to high-Mastery-Gain-per-hour candidates"), not as a learned or LLM-driven adjustment layer, consistent with those engines' own deliberately narrow V1 scope (`career-intelligence-engine.md` §7).

**Deferred past V1 entirely:**
- LLM-generated candidate creation from scratch (§5.2) — deferred until the Template Library's real-world coverage gaps are empirically known, per §5.2's tradeoff discussion.
- Calendar-informed time-availability input and Energy-level input (§2) — both explicitly future, consistent with `career-intelligence-engine.md` §7 and `onboarding-intelligence.md` §23.
- Any learned/ML-based scoring model (as opposed to the deterministic formula above) — a data-driven scoring refinement is a plausible multi-year evolution (mirroring `career-intelligence-engine.md` §8's Year 2–3 phase), not a V1 concern; V1 has far too little History for one user to train anything meaningfully better than a well-reasoned deterministic formula.

The governing test, restated concretely for this engine: any proposed V1 component that introduces non-determinism, an unbounded generative surface, or a dependency on data this single-user system doesn't yet have enough of to use reliably, is deferred by default.

---

## 11. Failure Modes

| Failure Mode | Detection | Response |
|---|---|---|
| **No eligible candidates found** (e.g., all Goal-relevant nodes are `locked` or already `mastered`) | Candidate pool is empty after Filter Impossible Tasks (§4). | The engine should not fail silently or return nothing — it should fall back to a broader search (relaxing Goal-relevance strictness, or surfacing a Reflection/Milestone-style prompt) and, if genuinely nothing is eligible, honestly tell the user their Goal-relevant Skill Graph is currently fully unlocked-and-mastered or fully blocked, rather than returning an empty or generic response. |
| **Tied or near-tied top candidates** | Priority Score gap between top two candidates falls below a materiality threshold (§9). | Confidence Score (§3) is reduced accordingly, and the Reasoning Trace should say so explicitly rather than presenting artificial certainty about a close call — this is the direct, concrete instance of the schema-level confidence-composition principle applied to this engine's own output. |
| **Stale Career Graph state** (Constraint or Goal changed but Planning Engine hasn't re-run yet) | A Constraint or Goal Model change event is detected without a corresponding Roadmap recomputation timestamp update. | The Task Generation Engine should not proceed on known-stale input — it should trigger the Planning Engine (§8, "a goal changes" / "weekly hours change") before generating a recommendation, rather than silently reasoning over an outdated Roadmap slice. |
| **Contradiction between Risk Model and Opportunity Model** (e.g., Risk Model flags burnout risk while Opportunity Model flags a time-sensitive opportunity requiring a push) | Both adjustment stages (§4) produce conflicting directional pressure in the same invocation. | Per the Honesty principle, this tension is surfaced explicitly in the Reasoning Trace rather than silently resolved by whichever adjustment happens to run last in the pipeline order — the user should see the actual tradeoff and, where appropriate, be given the choice rather than having it made invisibly on their behalf. |
| **Template Library gap** (an identified Skill gap has no matching Task template, §5.1) | Candidate generation for a specific gap produces zero candidates despite the gap itself being valid and eligible. | The engine should surface a broader, less-specific fallback Task (e.g., a general "explore this Skill" prompt) rather than silently skipping that gap entirely, and this specific miss should be logged as a content gap for the Template Library's maintainers — directly informing future authoring priority, per §5.1's acknowledged coverage-effort tradeoff. |
| **Repeated user overrides of the same recommendation type** | User override history (§2) shows a consistent pattern against a specific kind of candidate. | Per Guiding Principle 18, this is treated as signal that the scoring model or template selection has a systematic misalignment for this user, not as repeated independent errors — it should suppress that candidate type more aggressively going forward and, if the pattern is strong enough, prompt a Reflection Engine check-in rather than continuing to generate and re-reject the same kind of Task silently. |

---

## 12. Open Questions

- **The precise formula structure for §6's scoring model.** This document specifies the factors and the three weighting principles deliberately, without committing to a specific mathematical structure (weighted sum vs. gated multi-factor sort vs. another approach) — this is left open for implementation-time design, to be resolved by whoever builds this engine, informed by real candidate-scoring examples rather than decided in the abstract here.
- **Specific materiality thresholds** for Confidence decay, Constraint change magnitude, and score-gap "tie" detection (§9, §11) — intentionally deferred to calibration against real usage data, consistent with the same open-threshold stance already taken in `skill-graph-schema.md` §11.
- **How aggressively the Template Library (§5.1) should be pre-authored versus grown incrementally from real Template Library gaps (§11)** — a full upfront authoring pass across the entire ontology versus a minimal seed set expanded reactively as gaps are logged is a real tradeoff between initial build time and early recommendation quality, not resolved here.
- **Where exactly the line sits between "Task Generation Engine handles locally" and "triggers Planning Engine recomputation"** for borderline Constraint changes (§8) — the general principle (known variance handled locally, genuine shifts trigger recomputation) is stated, but the precise boundary is left for implementation-time judgment informed by real usage patterns.
- **Whether Confidence Score (§3) should ever be surfaced prominently to the user versus kept primarily as an internal/debugging signal** — this document specifies that it must be computed and available, per the confidence-composition discipline, but its actual product-surface prominence is a design decision for whoever builds the consuming UI, not this document.

---

## 13. Suggested Revisions

- **Terminology convergence.** As noted in the header, this document's "Task Generation Engine" and the architecture document's "Recommendation Engine / Daily Task Engine" (`career-intelligence-engine.md` §4.9) refer to the same capability. Recommend updating `career-intelligence-engine.md` and `glossary.md` to either adopt "Task Generation Engine" as the canonical name going forward, or explicitly cross-reference this document under the existing name — the current state, where this document exists under a third name for the same concept, risks the same kind of terminology drift already flagged once before (`career-intelligence-engine.md` §9, regarding "Career Intelligence Engine" vs. "Decision Engine"). A single glossary update resolves both instances at once.
- **Formalize the Confidence/Mastery independence distinction at the scoring level.** `skill-graph-schema.md` establishes Mastery and Confidence as independent axes, and this document's §6.1 (Knowledge retention / Skill decay factor) and §4 (Identify Skill Gaps stage) both rely on that independence to justify recommending verification-type Tasks on high-Mastery/low-Confidence nodes. This reasoning pattern is not currently named anywhere in the product or architecture documents as a distinct recommendation *type* (as opposed to a "new material" recommendation) — recommend `glossary.md` add a term for this (e.g., "Verification Task" alongside the existing implicit "Learning Task") so future documents can refer to it precisely rather than each re-deriving the distinction.
- **`career-intelligence-engine.md` §4.9's Recommendation Engine description should reference this document directly** once committed, since this document supersedes that section's brief summary with the actual implementation contract — recommend adding a one-line pointer from that section to this file, consistent with how other cross-document references are already handled elsewhere in the repository (e.g., `onboarding-intelligence.md`'s references back to the architecture document).
