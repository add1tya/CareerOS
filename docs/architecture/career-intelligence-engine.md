# The Career Intelligence Engine

Status: Foundational architecture document. Source of truth for how CareerOS reasons. Changes here require the same rigor as changes to `docs/product/*`.

Source documents treated as ground truth for this design: `docs/product/founder-intent.md`, `docs/product/vision.md`, `docs/product/product-philosophy.md`, `docs/product/guiding-principles.md`, `docs/product/glossary.md`. Where this document needed to extend rather than merely apply those documents, that is called out explicitly in §9 rather than silently assumed.

A terminology note up front: the product documentation (glossary) establishes **Decision Engine** as the preferred term, with **Career Intelligence Engine** marked as a deprecated synonym, kept only for historical reference. This document is filed under the legacy name because that is the requested deliverable path, but the term used throughout the body of this document is **Decision Engine**, consistent with the glossary. Treat the two as identical; do not create a second concept.

---

## 1. High-Level Mental Model

Engineers should think about this system the way they think about a routing engine for a map, not a content management system for a curriculum.

A curriculum system stores an ordered sequence of content and marks the user's position in it. The sequence is the artifact; the system's job is to serve it faithfully.

A routing engine stores none of that. It stores a **map** (the terrain — roads, distances, traffic) and a **destination**, and it computes a **route** fresh, every time conditions change, discarding the previous route without ceremony when a better one exists. The route is never the source of truth. The map and the destination are.

The Decision Engine is a routing engine for a career, not a curriculum server for a skill set. Concretely:

- The **map** is the Skill Graph plus the user's demonstrated Mastery, Learning Profile, and Constraints — the terrain the user is actually moving through.
- The **destination** is the active Goal(s).
- The **route** is the Roadmap, decomposed into Missions, Quests, and — at the point of actual execution — a ranked set of Tasks for right now.
- **Traffic** is everything that changes the terrain in real time: missed weeks, faster-than-expected mastery, a new constraint, a shift in goal, new external signal (e.g., a relevant opportunity appearing).

The single most important consequence of this mental model, stated as a hard architectural commitment: **the Roadmap is never stored as the source of truth. It is recomputed.** What is stored is the map (graph state, history, constraints) — never the route. This is restated from Guiding Principle 8 because everything else in this document depends on holding that line, and it is the single most common place a system like this quietly degrades into "curriculum server with extra steps."

A second consequence: routing engines are honest about uncertainty (a route has an ETA with a confidence interval, not a guarantee). The Decision Engine must carry the same discipline — every output has an associated confidence, not just a value.

---

## 2. Inputs

Inputs are grouped by how directly they should influence a decision and by how frequently they change. Each is explained by what specific reasoning failure it prevents if omitted.

### 2.1 Goal-defining inputs (low frequency of change)

- **Stated Goal(s)** — the destination itself. Without it, there is no basis for "highest expected-value," since expected value is always value *relative to something*.
- **Deadlines** — hard or soft time bounds on a Goal. Necessary because the same task can be correctly high-priority under a 3-year timeline and incorrectly high-priority under a 6-month one — urgency changes the shape of the optimal path, not just its speed.
- **Domain Advantage inputs** (e.g., mechanical engineering background) — necessary to avoid treating the user as a generic blank-slate learner. Without this, the engine will systematically over-recommend foundational content the user does not need and under-recommend the domain-transfer work that is actually their highest-leverage opportunity.

### 2.2 Capacity inputs (medium frequency of change)

- **Weekly available hours (Constraint)** — without this, the engine cannot distinguish between an ambitious-but-feasible plan and a plan that guarantees failure by exceeding real capacity. This is the single most common cause of static-plan failure (per `founder-intent.md` §1) and must be treated as a hard constraint, not a soft preference.
- **Employment obligations / competing commitments** — shapes not just how many hours exist, but when (e.g., only weekend hours support deep, uninterrupted work; weekday hours may only support shallow tasks). The engine should reason about hour *quality*, not just hour *quantity*.
- **Energy patterns** (self-reported or inferred) — necessary because a technically-optimal task scheduled against low-energy time is not actually optimal in practice. This input is explicitly lower-confidence than hard Constraints and should never override them, only refine within them.

### 2.3 State inputs (high frequency of change)

- **Current Skill Graph / Mastery levels** — the single most load-bearing input; without an accurate picture of "where the user actually is," every downstream recommendation is reasoning about a fictional user.
- **Learning history (completed Tasks, Quests, Missions)** — necessary both to update Mastery and to compute Learning Velocity (actual pace vs. planned pace).
- **Projects / built artifacts** — a stronger, higher-confidence signal of Mastery than self-report or passive completion, per the "build to learn" philosophy (`product-philosophy.md` §10). Weighted more heavily than, e.g., "watched a course."
- **GitHub activity** (or equivalent build-artifact signal) — an external, low-effort-to-collect proxy for actual applied work, useful for corroborating self-reported progress without requiring the user to manually log everything.
- **Journal / Reflection entries** — the primary channel for information the system cannot infer structurally: why a task was hard, what felt misaligned, what the user actually cares about this week. Necessary because purely behavioral signals (completions, GitHub activity) cannot capture motivation or context.
- **Feedback on prior recommendations** (explicit ratings, or implicit override behavior) — the core signal the engine uses to detect when its own model of the user is wrong, per Guiding Principle 18 ("overrides are signal, not errors").
- **Calendar** (if available) — used only to sanity-check stated available hours against actual free time, not as a scheduling authority. Optional in V1; not a hard dependency.
- **Previous decisions** (the full history of what the engine has recommended and why) — necessary so the Reasoning Trace is coherent over time and so the engine does not repeat a recommendation the user has already explicitly rejected for a stated reason.

### 2.4 Why exclusions matter as much as inclusions

Anything not listed above is deliberately excluded from V1's input set, most notably: social/peer comparison data, external market/job-posting data, and biometric data. Each would add real signal in principle, but each also adds a class of risk (comparison-driven anxiety, premature market-chasing, privacy exposure) disproportionate to its V1 value. They are candidates for the Future Evolution section (§9), not silent scope creep now.

---

## 3. Internal Models

These are the structured representations the Decision Engine reasons over. Each is a *model of something real*, not a UI concept — the Skill Tree (UI) visualizes the Skill Graph (model); they are not the same thing (see glossary).

### 3.1 Career Graph
The superset model: Skill Graph + Goals + Constraints + History, considered as one connected structure. This is what gets serialized when the system needs a complete snapshot of "everything currently known about this user's professional state."

### 3.2 Skill Graph
Nodes = Skills, edges = Dependencies, each node carrying a Mastery value with an associated confidence and a last-updated timestamp. This is the terrain of the routing analogy. It is domain-specific (AI engineering in V1) but the graph structure itself is domain-agnostic, which is what makes future Domain Packs (vision.md §"Long-Term Evolution") feasible without a rewrite.

### 3.3 Goal Graph
Goals are not always flat and independent — a long-term Goal ("become an AI engineer") decomposes into sub-goals that may have their own dependencies and relative priority (e.g., "be employable" vs. "be technically excellent" are related but not identical, and can trade off against each other in the short term). The Goal Graph makes these relationships and relative weights explicit, rather than leaving "the goal" as an unstructured string the rest of the system has to reinterpret each time.

### 3.4 Knowledge Graph
Reserved, not populated in V1 (per glossary). Would represent general domain knowledge/content independent of any specific user's Mastery — e.g., a shared representation of "what RAG is" that many users' Skill Graphs could reference. Explicitly deferred; V1 treats Skill definitions as a static, hand-curated seed set rather than a separately modeled knowledge base.

### 3.5 Learning Profile
A model of *how* this specific user learns, distinct from *what* they know (Skill Graph) — e.g., ratio of built-artifact-driven learning vs. passive consumption that actually produces durable Mastery for them, historically observed pace variance, and which Skill categories they tend to over- or under-estimate their own Mastery in. This model is what allows the Decision Engine to calibrate, over time, e.g., discounting this specific user's self-reported Mastery in domains where they have a demonstrated pattern of overconfidence.

### 3.6 Constraint Model
The structured representation of everything that bounds the feasible action space: available hours by day-type, hard deadlines, non-negotiable external obligations. This is kept as a distinct model from the Career Graph because constraints are *bounds on the solution space*, not properties of the user's skill — conflating them makes the reasoning harder to audit.

### 3.7 Decision Context
The specific, assembled bundle of Career Graph + Goal Graph + Constraint Model + recent History, as of a specific moment, that is actually handed to the reasoning layer to produce one recommendation. This is an ephemeral, request-scoped model, not persisted state — its role is to make explicit exactly what information a given recommendation was based on, which is what makes the Reasoning Trace possible.

### 3.8 User State
A lightweight, fast-changing model layered on top of the more stable Career Graph: current Momentum, current Confidence (system's confidence in its own model of the user, not the user's self-confidence), and recent trend direction. This is what allows the engine to distinguish "user is on a stable, sustainable pace" from "user just had a breakthrough week" from "user is showing early signs of drift" without re-deriving all of that from raw history on every request.

### 3.9 Momentum
A computed, short-window signal (e.g., trailing 2–3 weeks) of engagement and completion trend, used to modulate tone and task sizing — not to change what the highest-value Skill target is, only how it is packaged (e.g., smaller, more frequent wins recommended during low-momentum periods, without abandoning the underlying priority).

### 3.10 Confidence
Attached to every Mastery estimate, every Learning Velocity estimate, and every recommendation. Confidence is a first-class value throughout this system, not an afterthought — per Guiding Principle 19, low confidence must be visible to the user, never smoothed away.

### 3.11 Risk Model
A structured estimate of what could cause the current plan to fail to reach the Goal in time: pace risk (Learning Velocity below required rate), scope risk (Skill Graph incomplete relative to the actual target role), and burnout risk (Momentum trending down against a high planned load). Distinct from Confidence — Confidence is about how sure the system is about its own estimates; Risk is about how likely the plan itself is to fail even if the estimates are accurate.

### 3.12 Opportunity Model
A structured representation of asymmetric, time-bound opportunities to accelerate the Goal outside the default linear path — e.g., a Domain Advantage Skill combination that suddenly makes a specific niche newly viable, or a Constraint change (more available hours) that unlocks a previously infeasible Mission. Deliberately scoped narrow in V1 (see §7) to avoid becoming a speculative "opportunities" feed disconnected from the Skill Graph.

---

## 4. Core Engines

Each engine below is a distinct reasoning responsibility, not necessarily a distinct service — in V1, several of these will be implemented as different prompt/reasoning strategies over the same underlying Claude API integration, not as separately deployed systems. The separation here is conceptual, so responsibilities stay legible even when the implementation is consolidated.

### 4.1 Decision Engine (orchestrator)
- **Purpose:** the top-level reasoning authority; assembles a Decision Context and produces ranked, explainable output. Coordinates the other engines rather than duplicating their logic.
- **Inputs:** Career Graph, Goal Graph, Constraint Model, User State.
- **Outputs:** a ranked recommendation (Task, Skill re-prioritization, or Roadmap adjustment) with an attached Reasoning Trace and Confidence.
- **Responsibilities:** decide *which* other engine's output is actually relevant right now (e.g., a routine daily request needs the Planning Engine's near-term view; a "why am I behind" question needs the Risk Engine).
- **Interactions:** calls Planning, Risk, Recommendation, and Opportunity engines as needed; never called by them (strict top-down orchestration, no peer-to-peer engine calls, to keep the reasoning graph auditable).

### 4.2 Planning Engine
- **Purpose:** computes the Roadmap — the current best-known sequence of Missions/Quests from present Skill Graph state to Goal, given Constraints.
- **Inputs:** Skill Graph, Goal Graph, Constraint Model.
- **Outputs:** an ordered, time-estimated Mission/Quest structure (computed fresh, per §1's hard commitment — never the persisted source of truth).
- **Responsibilities:** respect Dependency edges in the Skill Graph (never sequence a Skill before its prerequisites are sufficiently mastered); respect hard Constraints as bounds, not preferences.
- **Interactions:** consumed by the Decision Engine and by the Daily Task Engine (a specialization of Planning at the finest granularity — see 4.9).

### 4.3 Execution Support ("Task-level reasoning")
Not modeled as a separate persistent engine in V1 — the finest-grained recommendation (the actual daily Task list) is produced by the Decision Engine applying the Planning Engine's near-term Roadmap output through the lens of current Constraints and Momentum. Called out here explicitly because earlier planning language used "Execution Engine" as a named component; this document treats it as a mode of the Decision Engine, not a separate reasoning system, to avoid an unjustified extra abstraction (Guiding Principle 7).

### 4.4 Reflection Engine
- **Purpose:** processes Journal/Reflection input and recent History into structured updates to the Learning Profile and Skill Graph Mastery estimates.
- **Inputs:** Journal entries, recent Task completions/overrides, prior Mastery estimates.
- **Outputs:** proposed Mastery adjustments (with Confidence), proposed Learning Profile updates.
- **Responsibilities:** never silently overwrite Mastery — proposed adjustments are surfaced to the user for confirmation at Milestones (per `glossary.md`'s definition of Reflection), keeping the human in the loop on their own self-model.
- **Interactions:** feeds updated state to the Decision Engine and Planning Engine for the next cycle.

### 4.5 Recovery Engine
- **Purpose:** specifically handles the "Streak broken" or "plan diverged from actual pace" case, per Guiding Principle 5 and the Product Philosophy's "recovery, not shame" stance.
- **Inputs:** User State (Momentum), Risk Model, recent History.
- **Outputs:** a recomputed near-term plan and an explicit, honest explanation of what changed and why — never a generic encouragement message standing in for the plan update.
- **Responsibilities:** treat missed time as new Constraint information (Guiding Principle 5: "the plan's assumptions were wrong"), not as a user failure to be management-coached through.
- **Interactions:** triggers the Planning Engine to recompute; may invoke the Risk Engine to check whether the deadline is now genuinely at risk (and say so, per the Honesty philosophy) rather than silently absorbing the slip.

### 4.6 Mentor Engine
- **Purpose:** the reasoning layer specifically behind the Mentor Chat surface — handles open-ended user questions, requests for re-explanation, and free-form re-planning requests.
- **Inputs:** full Decision Context, conversation history, the specific user query.
- **Outputs:** natural-language responses grounded in the same Career Graph and Reasoning Trace data the rest of the system uses — never a parallel, ungrounded chat experience.
- **Responsibilities:** must not reason independently of the structured models (Guiding Principle 25: recommendations must be re-derivable from stated goals/constraints) — the Mentor Engine is a natural-language front end onto the Decision Engine's actual reasoning, not a separate opinion.
- **Interactions:** calls the Decision Engine for any question that implies a recommendation change; can answer purely explanatory questions ("why was this recommended") directly from stored Reasoning Traces without a new full reasoning pass.

### 4.7 Prediction Engine (part of Risk Engine in V1 — see §7)
- **Purpose (future-scoped):** forecasts Learning Velocity forward to estimate probability of reaching the Goal by the stated Deadline given current trend.
- V1 implements a simplified version of this directly inside the Risk Engine (§4.8) rather than as a standalone engine, since a full predictive model requires more historical data than a single user accumulates quickly. Full separation is a Future Evolution candidate (§9).

### 4.8 Risk Engine
- **Purpose:** maintains the Risk Model — surfaces pace risk, scope risk, and burnout risk explicitly.
- **Inputs:** Learning Velocity (derived from History), Skill Graph completeness relative to Goal, Momentum trend.
- **Outputs:** a structured risk assessment with Confidence, consumed by the Decision Engine (to weight recommendations toward risk mitigation when risk is high) and directly surfaced to the user (per the Honesty principle — Product Philosophy §11).
- **Interactions:** invoked by the Decision Engine on every planning cycle, not just on demand, so drift is caught early (Guiding Principle 5) rather than only when the user explicitly asks.

### 4.9 Recommendation Engine (a.k.a. Daily Task Engine at its finest grain)
- **Purpose:** produces the actual ranked Task list for "right now," given the Planning Engine's near-term Roadmap, current Constraints (today's available hours), and Momentum.
- **Inputs:** near-term Roadmap slice, Constraint Model (today), User State.
- **Outputs:** ranked Task(s), each with an attached Reasoning Trace referencing the specific Skill gap and Goal it serves.
- **Responsibilities:** respect hour budgets exactly (never recommend more than fits); prefer higher-Dependency-unlocking Skills when multiple Tasks are otherwise similarly ranked (unblocking future options is weighted as real value, not just immediate Mastery gain).
- **Interactions:** the most frequently invoked engine in the system — this is what powers the core "what should I do right now" product surface.

### 4.10 Opportunity Engine
- **Purpose:** narrowly scoped in V1 to detecting when a Constraint change or a Domain Advantage combination unlocks a materially better path than the current default Roadmap.
- **Inputs:** Opportunity Model, Skill Graph, Constraint Model.
- **Outputs:** a rare, high-signal surfaced suggestion — explicitly designed to be low-frequency; if this engine fires often, that is treated as a signal the Opportunity Model's thresholds are miscalibrated, not as a feature working well.
- **Interactions:** feeds suggestions to the Decision Engine, which decides whether to surface them now or hold them for the next natural Reflection point, to avoid disrupting a stable plan with noise (Principle in §6: "when should plans remain stable").

---

## 5. Decision Loop

```
        ┌─────────────────────────────────────────────────────────┐
        │                                                         │
        ▼                                                         │
   ┌─────────┐    ┌────────────┐    ┌────────┐    ┌──────┐    ┌────────┐
   │ OBSERVE │───▶│ UNDERSTAND │───▶│ REASON │───▶│ PLAN │───▶│ EXECUTE│
   └─────────┘    └────────────┘    └────────┘    └──────┘    └────────┘
                                                                    │
        ┌───────────────────────────────────────────────────────────┘
        ▼
   ┌─────────┐    ┌───────────┐    ┌──────────────────┐
   │ MEASURE │───▶│ REFLECT   │───▶│ UPDATE USER MODEL │──▶ (loop)
   └─────────┘    └───────────┘    └──────────────────┘
```

**Observe** — raw signal enters the system: a completed Task, a Journal entry, a GitHub commit, an explicit override of a prior recommendation. No interpretation happens at this stage; it is pure capture.

**Understand** — raw signal is normalized into model updates: does this Task completion move Mastery on a Skill node, and by how much (with what Confidence)? Does this Journal entry imply a Learning Profile adjustment? This stage is where the Reflection Engine primarily operates.

**Reason** — the Decision Engine assembles a fresh Decision Context and evaluates the current state against the Goal Graph and Constraint Model: are we on pace (Risk Engine), is there a better path available (Opportunity Engine), what does the near-term Roadmap look like now (Planning Engine)?

**Plan** — output of Reason is converted into a concrete, ranked near-term plan: an updated Roadmap slice and, at the finest grain, the current ranked Task list (Recommendation Engine). This stage always produces a Reasoning Trace alongside the plan.

**Execute** — the user acts (or doesn't) on the recommendation. This is the only stage that happens outside the system's control — the Decision Engine cannot force execution, only make the highest-value action maximally clear and low-friction to take.

**Measure** — the system observes what actually happened relative to what was recommended: completed as planned, partially completed, overridden, or ignored. This is captured factually, without judgment (Guiding Principle 18).

**Reflect** — at natural checkpoints (Milestones, or explicit user-initiated Reflection), the system surfaces its own updated understanding back to the user for confirmation — this is the one stage that is deliberately synchronous and human-facing rather than automatic, because self-model updates should not happen silently (§4.4).

**Update User Model** — confirmed changes are committed to the Career Graph, Learning Profile, and User State, closing the loop. The next Observe stage begins against this updated state.

This loop runs continuously and at multiple time scales simultaneously: Recommendation Engine output effectively cycles through Observe→...→Execute daily; Risk and Opportunity assessment cycle weekly; full Reflection cycles at Milestones. The loop is not a single global clock — different engines operate on different natural cadences, and the Decision Engine's orchestration role includes knowing which cadence a given request falls into.

---

## 6. Principles

These govern *behavior* of the reasoning layer specifically — they extend, and must never contradict, the product-level Guiding Principles.

**On uncertainty:** the engine expresses uncertainty numerically wherever the underlying estimate is genuinely uncertain (a Confidence value attached to Mastery, Risk, and Recommendation outputs) — never as a vague qualitative hedge that provides no actual information ("this might work") and never suppressed to appear more authoritative than the underlying signal supports.

**On saying "I don't know":** the engine says this explicitly when Confidence in the relevant estimate falls below a usable threshold (e.g., insufficient completed Tasks to estimate Learning Velocity for a newly added Skill). In that state, it should say what additional signal would resolve the uncertainty (e.g., "complete two more Tasks in this Skill area before I can confidently re-rank it"), rather than leaving the user with an unhelpful non-answer.

**On confidence composition:** Confidence in a downstream output (e.g., a Roadmap projection) can never exceed the Confidence of its weakest required input. A Roadmap built partly on a low-confidence Mastery estimate must itself report reduced confidence — confidence does not average away uncertainty, it inherits the floor.

**On when plans should change:** a plan changes when new signal materially shifts the Risk Model (pace has genuinely diverged, not just a single off day), when a Constraint actually changes, or when the Opportunity Engine surfaces a rare, high-Confidence better path. Routine day-to-day variance in Momentum should *not* trigger a Roadmap-level replan — only Task-level ranking adjustment. This distinction (Roadmap stability vs. Task-level responsiveness) is what prevents the system from feeling erratic while still being genuinely adaptive.

**On when plans should remain stable:** stability is a designed property, not an accident of infrequent recomputation. The Planning Engine should treat the current Roadmap as having inertia — a new signal must clear a materiality threshold before it is allowed to reshuffle Missions, even though the underlying computation is capable of running fresh every time. Recomputing "fresh" (§1) does not mean recomputing *volatile*; a good router doesn't re-route your car for a five-second traffic blip.

**On honesty vs. encouragement:** where these conflict, honesty wins, without exception (`product-philosophy.md` §11). The engine may choose *how* to deliver a hard truth (e.g., pairing a pace warning with a concrete recovery plan) but may never soften the truth itself into something less accurate.

---

## 7. Version 1 Scope

V1 implements a working, honest version of this architecture at minimum viable fidelity — not a stubbed-out version that merely gestures at it. The following scoping decisions keep it buildable within the 8-week MVP window while preserving the core commitments above.

**In scope for V1:**
- Full Skill Graph and Career Graph data model, hand-seeded for the AI engineering domain (no separate Knowledge Graph — Skills are curated content, per §3.4).
- Decision Engine, Planning Engine, Recommendation Engine, and Risk Engine implemented as reasoning modes over the Claude API, with Reasoning Traces stored per recommendation.
- Mentor Engine as a grounded natural-language front end over the same Decision Context (this is the Mentor Chat feature).
- Reflection Engine in a lightweight form: proposed Mastery updates surfaced for user confirmation, triggered manually by the user rather than fully automatic Milestone detection.
- Recovery Engine as an explicit mode triggered when a Streak breaks or a Task backlog accumulates — recomputes near-term plan and gives an honest explanation.
- Confidence values attached to Mastery and to every Recommendation output.

**Explicitly deferred past V1:**
- **Opportunity Engine** — real, but held to a stub that only checks for the single, well-defined case of a Constraint change (e.g., available hours increased); the broader "detect asymmetric opportunity" capability requires more historical data and market-context input than V1 has reason to collect.
- **Standalone Prediction Engine** — folded into a simplified Risk Engine calculation (linear trend extrapolation of Learning Velocity) rather than a separate forecasting model; a single user's history is too short a series for anything more sophisticated to outperform a simple trend line.
- **Automatic Milestone/Reflection triggering** — V1 requires the user to initiate Reflection; automatic detection of "this is a natural reflection point" is deferred.
- **Calendar integration** — mentioned in §2.3 as optional; not built in V1 unless it becomes a clear blocker to accurate Constraint modeling.
- **Cross-user Learning Profile calibration** — with one user, there is no population to calibrate against; Learning Profile in V1 is purely self-referential (this user's own history), not benchmarked against others.

The governing test for every deferral above: does its absence cause the engine to produce a *dishonest* or *structurally wrong* recommendation, or merely a *less optimal* one? Anything in the deferred list fails softly — the engine remains honest and directionally correct without it. Nothing that would cause silent overconfidence or a structurally broken recommendation is deferred.

---

## 8. Future Evolution

Over a multi-year horizon, assuming V1 proves the core loop works for its single user, the architecture is designed so the following extensions are additive, not rewrites:

**Year 1–2: Depth over one user.** Full Prediction Engine with genuine probabilistic forecasting (once enough History exists for it to outperform trend extrapolation); automatic Milestone/Reflection triggering; broader Opportunity Engine reasoning incorporating external market signal (job posting trends, in-demand skill shifts) as a new, clearly-flagged lower-confidence input class, kept separate from the user's own Skill Graph so it never silently inflates Confidence in personal Mastery estimates.

**Year 2–3: Generalization across domains.** The Skill Graph and Goal Graph structures generalize beyond "AI engineering" into a Domain Pack model (per `vision.md`), allowing the same Decision Engine architecture to reason about other long-horizon transitions without redesigning the reasoning layer itself — only the seed content changes.

**Year 2–3: Multi-user calibration.** With a population of users, the Learning Profile model can be enriched with population-level priors (e.g., "users with X background typically show Y Learning Velocity on Z skill category") — introduced carefully, as a prior that individual observed data should always be allowed to override, never as a replacement for this user's own signal (this is the point at which the Confidence-composition principle in §6 becomes load-bearing at a new scale: population priors must never be allowed to report higher Confidence than the individual's own sparse data actually warrants).

**Year 3+: Opportunity Engine as a genuine differentiator.** If the core loop is proven, the Opportunity Engine is the most product-differentiated component to invest in — genuinely detecting asymmetric, individual-specific paths (leveraging a user's unique Domain Advantage combinations against real external signal) is a much harder and more valuable problem than routine roadmap planning, and is exactly the kind of capability that could not exist in a static roadmap or a generic course platform. It is deliberately built last, on top of a Decision Engine that has already earned trust through V1's more modest, honest scope.

---

## 9. Suggested Revisions to Existing Documentation

- **`glossary.md`**: this document's routing-engine framing (§1) is a useful mental model that isn't currently captured anywhere in the product docs. Consider adding a short cross-reference from the Roadmap and Decision Engine glossary entries pointing here, so engineers encounter the "map vs. route" framing before they encounter the term in isolation.
- **`guiding-principles.md`**: this document introduces the Confidence-composition rule (§6: "confidence inherits the floor, never averages") as a specific technical principle. It is consistent with, but more precise than, existing Principle 19 ("default to showing uncertainty"). Recommend promoting it to an explicit numbered principle rather than leaving it only in this architecture document, since it will directly constrain implementation choices engineers make outside the Decision Engine itself (e.g., in UI components that must decide how to render a low-confidence badge).
- No other contradictions identified; this document is additive to, not a revision of, the existing product documentation set.
