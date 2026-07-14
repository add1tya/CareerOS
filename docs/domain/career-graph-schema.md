# Career Graph Schema

Status: Foundational implementation document. This is the conceptual data model from which the database schema, API contracts, Decision Engine inputs, and UI state all derive. It is not itself a database schema — table design, indexing, and storage engine choices are downstream decisions made against this model, not part of it.

Source-of-truth documents this schema implements: `docs/product/*`, `docs/architecture/career-intelligence-engine.md`, `docs/architecture/task-generation-engine.md`, `docs/domain/ai-engineering-knowledge-model.md`, `docs/domain/skill-graph-schema.md`, `docs/product/onboarding-intelligence.md`.

---

## 1. Purpose

The Career Graph is the complete, structured representation of one user's professional state inside CareerOS at any point in time: who they are, what they're trying to achieve, what constrains them, what they know, what evidence supports what they know, what they've done, what they're planning to do, and what the system currently believes about all of the above.

It is the primary representation of the user for a specific architectural reason, restated from `skill-graph-schema.md` §1: every other view of the user — a dashboard number, a Skill Tree rendering, a Roadmap, a Mentor Chat response — must be a *derived view* over the Career Graph, never an independently-maintained parallel source of truth. If two features could ever disagree about the state of the user, that is a Career Graph modeling defect, not a UI synchronization bug to patch around.

**Relationship to the Skill Graph:** the Skill Graph (`skill-graph-schema.md`) is a *component* of the Career Graph, not a synonym for it — this mirrors the distinction already established there (§1: "The Skill Graph is a subset of the Career Graph, not a synonym for it"). The Career Graph additionally holds Goals, Constraints, Learning Profile, Domain Advantages, Tasks/Missions/Quests, the computed Roadmap, Reflections, Reasoning Traces, Risk/Opportunity state, and History — the Skill Graph alone answers "what does this user know"; the Career Graph answers "what is this user's complete situation."

The Career Graph is the direct implementation of the "map" in the architecture document's routing-engine mental model (`career-intelligence-engine.md` §1) — the Decision Engine never routes from anything other than the current Career Graph, and the Roadmap it produces is explicitly excluded from the Career Graph's persisted state, per that same document's hard commitment that the route is always computed, never stored (see §4.10 below for exactly where the boundary sits).

---

## 2. Top-Level Structure

```
CareerGraph
├── User                      (identity, ownership anchor)
├── Goals                     (Goal Model + Goal Graph)
├── Constraints                (Constraint Model)
├── SkillGraph                 (per skill-graph-schema.md — nodes + dependency edges)
├── LearningProfile            (how this user learns)
├── DomainAdvantages           (background-derived transfer credit)
├── Evidence                   (per skill-graph-schema.md §6 — referenced, not duplicated)
├── Tasks / Missions / Quests   (work-item hierarchy)
├── Roadmap                    (COMPUTED, not persisted — see §4.10)
├── Reflections                 (structured self-review records)
├── ReasoningTraces             (stored justification for every recommendation made)
├── RiskState                   (current Risk Model output)
├── OpportunityState            (current Opportunity Model output)
├── History                     (append-only event log)
└── Metadata                    (versioning, timestamps, schema version)
```

Every component below follows the same description structure: Purpose, Fields, Relationships, Ownership, Lifecycle, How It Changes, and Decision Engine Interaction.

---

## 3. Components

### 3.1 User

- **Purpose:** The identity anchor every other component attaches to. Represents one person using CareerOS, not a login credential specifically (authentication detail is out of scope for this conceptual model).
- **Fields:** `user_id` (UUID), `display_name`, `created_at`, `timezone` (relevant to Constraint Model interpretation — "a weekday" needs a reference timezone), `active_status` (whether currently engaged with the product, distinct from any Skill-level `dormant` status).
- **Relationships:** Every other top-level component is scoped by `user_id`, either directly (a foreign key) or transitively (nested within a directly-scoped component).
- **Ownership:** Fully owned by the user; no shared/multi-tenant fields in V1, consistent with `guiding-principles.md` #10 (schema designed for one user, never hard-coded to assume only one).
- **Lifecycle:** Created once, at account creation (which in V1 coincides with beginning Onboarding); rarely mutated thereafter beyond `display_name`/`timezone` updates and `active_status` transitions.
- **How It Changes:** Almost never, outside explicit user action (profile edit) or the system detecting a long absence (`active_status` transition, which triggers Recovery Engine involvement per `task-generation-engine.md` §8, not a User-record mutation in itself).
- **Decision Engine Interaction:** Supplies the scoping key for every query the Decision Engine makes; `timezone` is consumed by the Constraint Model's interpretation of "today's available hours" (`task-generation-engine.md` §2).

### 3.2 Goals

- **Purpose:** The destination(s) the entire Career Graph is oriented toward — the reference frame every other component's relevance is measured against (`career-intelligence-engine.md` §3.3, Goal Graph).
- **Fields:** `goal_id`, `title`, `description`, `deadline` (nullable), `status` (`active`, `achieved`, `abandoned`, `superseded`), `priority_weight` (relative weight when multiple Goals are simultaneously active, per the Goal Graph's sub-goal structure), `created_at`, `source` (`onboarding` vs. `user_initiated_update` vs. `reflection_derived`).
- **Relationships:** Goals connect to Skill Nodes via the `skill_goal_relevance` relationship (`skill-graph-schema.md` §2.1), which carries the actual `importance_weight` — Goals themselves do not directly enumerate their relevant Skills; that relevance lives on the relationship, not on either side alone. A Goal may have zero or more sub-goal Goals (Goal Graph structure), self-referencing via `parent_goal_id`.
- **Ownership:** User-owned, but system-mediated — Goals are validated at creation time per `onboarding-intelligence.md` §13 (structural validity, internal coherence, feasibility sanity check) and cannot be silently system-modified; any system-detected tension is surfaced, never auto-resolved (`onboarding-intelligence.md` §9).
- **Lifecycle:** Created at Onboarding (§13's validation gate) or later via explicit user update or Reflection-driven revision (`glossary.md` Reflection definition — a Goal can be confirmed, corrected, or adjusted at a Milestone). Transitions to `achieved`, `abandoned`, or `superseded` are terminal for that Goal record, but the record itself is never deleted (§6, Auditing).
- **How It Changes:** Rarely, and always deliberately — a Goal change is explicitly flagged in `task-generation-engine.md` §8 as an event requiring full Planning Engine recomputation, not a routine update absorbed silently.
- **Decision Engine Interaction:** The Planning Engine's primary reference frame (`career-intelligence-engine.md` §4.2); the Task Generation Engine's scoring model weights every candidate against active Goals' `priority_weight` and each Skill's relevance to them (`task-generation-engine.md` §6.1).

### 3.3 Constraints

- **Purpose:** The bounds on the feasible action space — everything that limits how a Goal can be pursued (`career-intelligence-engine.md` §3.6).
- **Fields:** `weekday_hours`, `weekend_hours` (both as ranges or typical values, per `onboarding-intelligence.md` §3.3), `seasonal_variance` (structured exceptions to the typical pattern, e.g., date ranges with different availability), `hard_deadlines` (references to Goal `deadline` fields, denormalized here for fast Constraint-checking without a join, if the implementation favors that — see §7), `competing_obligations` (free-text/structured list from Onboarding Q9), `last_confirmed_at`.
- **Relationships:** Referenced directly by the Task Generation Engine's Filter Impossible Tasks stage (`task-generation-engine.md` §4); indirectly shapes the Planning Engine's Roadmap feasibility.
- **Ownership:** User-declared, system-validated (Timeline Realism Checking, `onboarding-intelligence.md` §16, cross-references Constraints against Goals at Onboarding and whenever either changes materially).
- **Lifecycle:** Seeded at Onboarding; updated whenever the user reports a change, or when the system detects a sustained deviation between stated and actual behavior significant enough to warrant asking (a Reflection-triggered check-in, not an automatic silent correction, per Guiding Principle 21 — AI augments judgment, never overrides it unilaterally).
- **How It Changes:** Via explicit user update, or via `onboarding-intelligence.md` §17-style periodic recalibration prompts. A Constraint change beyond known seasonal variance is one of the explicit Planning Engine recomputation triggers (`task-generation-engine.md` §8).
- **Decision Engine Interaction:** A hard input to Filter Impossible Tasks (Task Generation Engine) and to Planning Engine feasibility computation; also a direct input to the Risk Model (pace risk is computed against Constraints, not just against Goals).

### 3.4 Skill Graph

- **Purpose:** As defined fully in `skill-graph-schema.md` — the terrain of demonstrated and potential capability. Included here only as a top-level Career Graph component reference, not redefined.
- **Fields / Relationships / Lifecycle:** See `skill-graph-schema.md` §2–§4 in full; not restated here to avoid the two documents drifting out of sync (a single source of truth for this component's detailed definition).
- **Ownership:** User-owned per node, per `skill-graph-schema.md` §2's `user_id` field.
- **How It Changes:** Per the Mastery Model (`skill-graph-schema.md` §5) — via Evidence, never direct writes.
- **Decision Engine Interaction:** The primary input to nearly every engine (`career-intelligence-engine.md` §4); see `skill-graph-schema.md` §10.3 for the full mapping.

### 3.5 Learning Profile

- **Purpose:** A model of *how* this user learns, distinct from *what* they know (`career-intelligence-engine.md` §3.5).
- **Fields:** `style_preference` (`build_first` / `study_first` / `mixed`, from `onboarding-intelligence.md` Q12), `structure_preference` (`linear` / `exploratory`, Q13), `self_assessment_reliability` (a per-domain-cluster map of observed self-report accuracy, initially empty/default and refined over time by comparing Self Report Evidence against later higher-tier Evidence for the same node), `observed_pace_pattern` (qualitative notes derived from History, e.g., "tends to front-load effort in the first two weeks of a new Mission"), `behavioral_style_signal` (from `onboarding-intelligence.md` §12's secondary observation of how Onboarding itself was answered).
- **Relationships:** Read by the Task Generation Engine's candidate-generation stage (`task-generation-engine.md` §5.1, template variant selection) and by the Reflection Engine when weighting new Self Report Evidence (§7 below).
- **Ownership:** Partially user-declared (style/structure preference), partially system-inferred (self-assessment reliability, pace pattern) — the two sub-types should be distinguishable in the data model (a `source` tag per field group), not merged into one undifferentiated blob, since they carry different Confidence characteristics.
- **Lifecycle:** Seeded at Onboarding (declared fields only); inferred fields begin populating only once real History exists, and remain at an explicit "insufficient data" state until they do — never defaulted to a false-confident guess.
- **How It Changes:** Declared fields change via explicit user update (rare); inferred fields update incrementally as new History and Evidence accumulate, computed by the Reflection Engine, not written directly by any other component.
- **Decision Engine Interaction:** Directly consulted by the Task Generation Engine (§5.1's template parameterization) and by the Reflection Engine's Evidence-weighting logic (`career-intelligence-engine.md` §4.4).

### 3.6 Domain Advantages

- **Purpose:** The structured record of background-derived transfer credit (`ai-engineering-knowledge-model.md`'s Domain Advantage term; detection procedure in `onboarding-intelligence.md` §11).
- **Fields:** `advantage_id`, `source_background` (e.g., "mechanical engineering"), `affected_skill_keys` (the Skill Graph nodes this advantage seeded above baseline), `confidence` (always Tier 1 ceiling at creation, per `skill-graph-schema.md` §7, since it originates from stated background, not verified Evidence), `detected_at`, `confirmed_by_evidence` (boolean-equivalent — whether real Evidence has since corroborated the initial transfer assumption).
- **Relationships:** Directly references affected Skill Graph nodes; does not duplicate their `mastery`/`confidence` values, only records the *reason* those nodes were seeded non-zero, preserving the provenance the Skill Node's own `notes` field references informally (`skill-graph-schema.md` §8.2's example).
- **Ownership:** System-inferred at Onboarding, explicitly surfaced to the user for confirmation (`onboarding-intelligence.md` §11, step 4) — not silently applied.
- **Lifecycle:** Created once at Onboarding (or when a later background update is provided, if that path is ever added); `confirmed_by_evidence` transitions from false to true as real Evidence accumulates on the affected nodes, at which point this record's ongoing relevance diminishes (its Mastery-seeding job is done; it remains as historical provenance, not an active input).
- **How It Changes:** Rarely — primarily the `confirmed_by_evidence` flag updating as a side effect of unrelated Evidence recording on the affected Skill nodes.
- **Decision Engine Interaction:** Consumed once, at Skill Graph seeding time (`onboarding-intelligence.md` §20); afterward its influence lives on inside the Skill Graph's own `mastery` values, not queried directly by the Decision Engine on an ongoing basis.

### 3.7 Evidence

- **Purpose:** As fully defined in `skill-graph-schema.md` §6 — the atomic unit of proof behind every Mastery/Confidence change. Included here as a top-level Career Graph component for completeness of the overall object, not redefined.
- **Fields / Relationships / Lifecycle:** See `skill-graph-schema.md` §6–§7 in full.
- **Ownership:** User-generated (submitted) or system-generated (e.g., a Mentor Validation record); always immutable once created (append-only, per `skill-graph-schema.md` §9.6).
- **Decision Engine Interaction:** Read by the Reflection Engine to compute Mastery/Confidence updates; read by the Task Generation Engine to determine which Evidence Type a candidate Task would produce (`task-generation-engine.md` §3).

### 3.8 Tasks / Missions / Quests

- **Purpose:** The work-item hierarchy — Missions (multi-week, Goal-aligned bodies of work), Quests (days-to-two-weeks decompositions of a Mission), and Tasks (single-session actionable units), per `glossary.md`'s definitions.
- **Fields (common across the hierarchy, with granularity-specific extensions):** `id`, `parent_id` (Mission for a Quest, Quest for a Task — nullable at the Mission level), `title`, `description`, `status` (`proposed`, `active`, `completed`, `skipped`, `abandoned`), `target_skill_keys`, `expected_duration`, `created_at`, `completed_at` (nullable), `source` (`planning_engine_generated` for Missions/Quests, `task_generation_engine_generated` for Tasks, `user_created` if a future version allows manual additions).
- **Relationships:** A Mission has many Quests; a Quest has many Tasks. Every Task references the Skill node(s) it targets and, upon completion, the Evidence record(s) it produced. A completed Task's Evidence is what actually drives Skill Graph Mastery updates — the Task record itself is a work-tracking artifact, not the source of truth for progress (that remains the Skill Graph, per Guiding Principle 9).
- **Ownership:** Missions and Quests are system-generated (Planning Engine output, materialized at the point a Roadmap slice is committed to active work — see §4.10 for the important distinction between the *computed* Roadmap and this *persisted* active-work subset). Tasks are primarily Task Generation Engine output, occasionally user-overridden (a substituted or self-declared Task).
- **Lifecycle:** A Mission is created when the Planning Engine commits it to the active near-term Roadmap (not merely when it's a theoretical future step); its Quests and Tasks are generated progressively, not all upfront, consistent with the "compute fresh, don't pre-commit distant detail" philosophy. Completed/abandoned items are retained (never deleted), transitioning to a terminal `status`.
- **How It Changes:** Status transitions driven by user action (completion, explicit skip) or system detection (long-idle Tasks auto-transitioning toward `abandoned` after a defined inactivity window, feeding Recovery Engine triggers).
- **Decision Engine Interaction:** This is the persisted record of what the Planning Engine and Task Generation Engine have actually committed to and what actually happened — distinct from the Roadmap itself (§4.10), which is the *broader, still-computed* view extending beyond what's been concretely materialized as active Missions/Quests/Tasks yet.

### 3.9 Roadmap

- **Purpose:** The current best-known path from present Skill Graph state to Goal(s), given Constraints (`career-intelligence-engine.md` §4.2).
- **Fields:** Not persisted as stored fields — see §4.10. Conceptually: an ordered projection of Missions (some already materialized in §3.8, most still theoretical/future) with estimated timing.
- **Relationships:** Derived from Skill Graph + Goals + Constraints at query time; the materialized subset of it becomes real Mission/Quest/Task records (§3.8) only as the user actually approaches and begins that work.
- **Ownership:** Entirely system-computed; never directly user-editable (a user can influence it only indirectly, through changing Goals/Constraints or through Task overrides that feed back into future computations).
- **Lifecycle:** N/A in the persistence sense — it does not have a lifecycle as a stored object. Conceptually "refreshed" on every Planning Engine invocation.
- **How It Changes:** Every time it's computed, by construction — though Recommendation Stability discipline (`task-generation-engine.md` §9) ensures it does not present as different to the user unless a materially new input justifies a different output.
- **Decision Engine Interaction:** This *is* a Decision Engine output, specifically the Planning Engine's — not an input to anything else, except in the narrow sense that the Task Generation Engine consumes "the current near-term Roadmap slice" as one of its own inputs (`task-generation-engine.md` §2), which in practice means invoking the Planning Engine's computation, not reading a stored Roadmap field.

### 3.10 Reflections

- **Purpose:** Structured, user-authored self-review records, captured at Milestones or on-demand (`glossary.md` Reflection definition).
- **Fields:** `reflection_id`, `trigger` (`milestone`, `user_initiated`, `recovery_check_in`), `prompt_shown`, `response_text`, `derived_updates` (a structured list of proposed Mastery/Learning Profile/Goal changes this Reflection implied, per `career-intelligence-engine.md` §4.4 — proposed, not yet committed), `user_confirmed_updates` (boolean per proposed update, since confirmation is required before commitment), `created_at`.
- **Relationships:** May produce new Evidence records (Reflection-type Evidence, `skill-graph-schema.md` §6) and/or propose Learning Profile or Goal updates; references the Skill nodes or Goals it pertains to.
- **Ownership:** User-authored content, system-interpreted (Reflection Engine) proposals, user-confirmed commitment — a three-step ownership chain that must remain visible in the data model (raw response vs. system interpretation vs. confirmed outcome are three distinct pieces of state, not one).
- **Lifecycle:** Created at a trigger point; `derived_updates` populated shortly after by the Reflection Engine; record becomes immutable once `user_confirmed_updates` is finalized (or explicitly declined).
- **How It Changes:** Only during the brief window between creation and confirmation; immutable afterward, consistent with the Evidence model's audit discipline.
- **Decision Engine Interaction:** Primary input to the Reflection Engine (`career-intelligence-engine.md` §4.4); indirectly reaches every other engine once its confirmed updates are committed to the Skill Graph/Learning Profile/Goals.

### 3.11 Reasoning Traces

- **Purpose:** The stored explanation attached to every Decision Engine output — Task recommendations, Roadmap adjustments, Skill re-prioritizations (`career-intelligence-engine.md` §3.7).
- **Fields:** `trace_id`, `subject_type` (`task_recommendation`, `roadmap_adjustment`, `mastery_update_proposal`), `subject_id` (reference to the specific Task/Mission/Skill node this trace explains), `inputs_consulted` (a structured reference list — which Skill nodes, which Goal, which Constraint values, which Risk/Opportunity state were actually used), `narrative` (the natural-language explanation, per `task-generation-engine.md` §3's Reasoning Trace field), `generated_at`, `generated_by` (which engine/pipeline stage produced it).
- **Relationships:** Every Recommended Task (§3.8) and every Roadmap-affecting decision has exactly one Reasoning Trace; Alternative Tasks (`task-generation-engine.md` §3) each get their own abbreviated trace as well.
- **Ownership:** Entirely system-generated; immutable once written (per both architecture documents' shared insistence that traces are never regenerated after the fact to match a later, different state).
- **Lifecycle:** Created at the moment of the decision it explains; never updated, only ever superseded by a new trace attached to a new decision.
- **How It Changes:** Never, once written — this immutability is what makes historical auditing (§6) actually meaningful.
- **Decision Engine Interaction:** Written by every engine that produces a recommendation; read by the Mentor Engine when answering "why was this recommended" without needing a fresh full reasoning pass (`career-intelligence-engine.md` §4.6).

### 3.12 Risk State

- **Purpose:** The current, persisted snapshot of the Risk Model's output (`career-intelligence-engine.md` §3.11) — pace risk, scope risk, burnout risk.
- **Fields:** `risk_id`, `pace_risk` (level + confidence), `scope_risk` (level + confidence), `burnout_risk` (level + confidence), `contributing_factors` (structured references to the specific Skill Graph/History/Constraint data that produced each risk level, for explainability), `computed_at`.
- **Relationships:** References the specific Goals, Constraints, and Learning Velocity data it was computed from.
- **Ownership:** Entirely system-computed (Risk Engine); never directly user-editable, though a user's response to a surfaced risk (e.g., adjusting a Constraint) indirectly changes the next computation.
- **Lifecycle:** Recomputed on every Planning Engine cycle (`career-intelligence-engine.md` §5's weekly Risk/Opportunity cadence) and stored as the latest snapshot; prior snapshots retained for trend visibility (§6), not overwritten in place.
- **How It Changes:** Whenever Learning Velocity, Constraints, or Goal Deadlines materially shift — same materiality discipline as elsewhere in this document set.
- **Decision Engine Interaction:** Consumed by the Task Generation Engine's Risk Adjustment pipeline stage (`task-generation-engine.md` §4, §6.1) and surfaced directly to the user per the Honesty principle.

### 3.13 Opportunity State

- **Purpose:** The current, persisted snapshot of the Opportunity Model's output (`career-intelligence-engine.md` §3.12), deliberately narrow in V1 scope (`career-intelligence-engine.md` §7).
- **Fields:** `opportunity_id`, `type` (V1: `constraint_change_unlock` only, per the architecture document's deferred broader scope), `description`, `affected_skill_or_goal_refs`, `confidence`, `surfaced_to_user` (boolean — whether this has already been shown, to respect the "rare, high-signal, not noisy" design intent), `detected_at`.
- **Relationships:** References the Constraint or Skill Graph change that triggered detection.
- **Ownership:** System-computed (Opportunity Engine); read-only to the user beyond acknowledging/dismissing a surfaced opportunity.
- **Lifecycle:** Created rarely, by design (`career-intelligence-engine.md` §4.10: "if this engine fires often, that is a signal the Opportunity Model's thresholds are miscalibrated"); most of the time, no active Opportunity State record exists at all for a given user, and that absence is the expected default, not a gap to fill.
- **How It Changes:** Only on detection of a new qualifying event; otherwise dormant.
- **Decision Engine Interaction:** Consumed by the Task Generation Engine's Opportunity Adjustment stage (`task-generation-engine.md` §4) when active.

### 3.14 History

- **Purpose:** The append-only event log underlying every other component's audit trail — the raw material from which Learning Velocity, Momentum, and all trend computations are derived.
- **Fields:** `event_id`, `event_type` (Evidence recorded, Task status change, Constraint update, Goal update, Reflection created, Reasoning Trace generated, Recovery Engine triggered, etc.), `payload` (a reference to the specific record the event pertains to, not a duplicated copy of its content), `occurred_at`, `actor` (`user` or the specific system engine).
- **Relationships:** References essentially every other component, as the unifying timeline across all of them.
- **Ownership:** Entirely system-generated, purely additive.
- **Lifecycle:** Append-only, forever — this is the one component with no meaningful "lifecycle" beyond continuous growth; retention/archival policy is a future operational concern (§9), not a schema concern.
- **How It Changes:** Only by addition, never by mutation or deletion.
- **Decision Engine Interaction:** The Risk Engine and the Learning Profile's inferred fields (§3.5) both compute directly from History; the Recovery Engine's gap-detection (`career-intelligence-engine.md` §4.5) is a History query (time since last qualifying event) before it is anything else.

### 3.15 Metadata

- **Purpose:** Versioning and schema-management information for the Career Graph object as a whole, distinct from any individual component's own `version`/`updated_at` fields.
- **Fields:** `schema_version` (which version of this document's structure the stored object conforms to — see §6), `career_graph_version` (an overall monotonic counter incremented on any component change, useful for cheap "has anything changed since I last checked" queries without inspecting every component), `last_full_snapshot_at`.
- **Relationships:** N/A — a top-level, non-relational bookkeeping component.
- **Ownership:** System-managed exclusively.
- **Lifecycle:** Updated on every write to any component beneath it.
- **How It Changes:** Automatically, as a side effect of any other component's mutation.
- **Decision Engine Interaction:** Used for cache invalidation (§4) and for detecting whether a cached Decision Context (`career-intelligence-engine.md` §3.7) is still valid or must be rebuilt.

---

## 4. Persisted, Computed, Cached, Immutable

| Component | Classification | Notes |
|---|---|---|
| User | Persisted, mutable | Rarely changes after creation. |
| Goals | Persisted, mutable (status transitions), individual records effectively append-preferred (superseded rather than overwritten) | See §3.2. |
| Constraints | Persisted, mutable | Updated in place, with History logging the change event. |
| Skill Graph (nodes, edges) | Persisted, mutable via defined update paths only | Per `skill-graph-schema.md` §5, §9. |
| Learning Profile | Persisted; declared fields mutable, inferred fields computed-and-cached | Inferred sub-fields are recomputed periodically (e.g., after each Reflection) rather than on every read. |
| Domain Advantages | Persisted, effectively immutable after creation (only `confirmed_by_evidence` flips) | |
| Evidence | Persisted, strictly immutable (append-only) | Per `skill-graph-schema.md` §9.6. |
| Tasks / Missions / Quests | Persisted, mutable (status transitions only — content is not edited post-creation, only superseded) | |
| **Roadmap** | **Computed, never persisted** | The one component explicitly excluded from storage, per the architecture document's hard commitment (§3.9 above). |
| Reflections | Persisted; mutable only in the brief pre-confirmation window, immutable after | See §3.10. |
| Reasoning Traces | Persisted, strictly immutable | See §3.11. |
| Risk State | Persisted as versioned snapshots (each computation is a new record, not an overwrite) | Enables trend analysis; "current" state is simply the latest snapshot. |
| Opportunity State | Persisted as versioned snapshots, same pattern as Risk State | Usually empty/absent. |
| History | Persisted, strictly append-only | The audit backbone. |
| Metadata | Persisted, system-managed | Updated as a side effect of all other writes. |

**Cached (not separately listed above, but cutting across several components):** the Decision Context (`career-intelligence-engine.md` §3.7) — the specific assembled bundle handed to a reasoning pass — is a request-scoped, ephemeral construction, not persisted as Career Graph state, but may be cached briefly (bounded by `career_graph_version`, §3.15) to avoid redundant reassembly across rapid successive Task Generation Engine invocations within a single session.

---

## 5. Evolution, Snapshots, and Versioning

The Career Graph is not a single static object that gets edited in place and forgotten — it is a continuously evolving structure whose *current state* is always reconstructible, and whose *state at any past point* must also remain reconstructible, per the Reasoning Trace auditability requirement already established in `skill-graph-schema.md` §9.6 and extended here to the whole object.

**Evolution model:** most components (Skill Graph, Goals, Constraints, Tasks) evolve through defined, append-preferring update paths rather than blind overwrites — a Skill Node's `version` increments with a corresponding history record (`skill-graph-schema.md` §9.6); Risk/Opportunity State are stored as a sequence of snapshots rather than one mutable record; Evidence, Reasoning Traces, and History are strictly append-only. The overall effect: reconstructing "what did the Career Graph look like on a specific past date" is always possible by replaying component-level history up to that timestamp, not just reading whatever the current state happens to be.

**Snapshots:** a full-object snapshot (`last_full_snapshot_at`, §3.15) is a periodic, denormalized convenience artifact — a materialized point-in-time copy of the assembled Career Graph, taken at natural checkpoints (Milestones, or a defined interval) purely to make historical review and debugging fast, without requiring a full replay of every component's history every time. Snapshots are derived, not authoritative — the authoritative history always remains the underlying component-level records; a snapshot could in principle always be regenerated from them.

**Versioning:** two distinct versioning concerns must not be conflated:
1. **Schema versioning** (`schema_version`, §3.15) — which structural version of *this document* a stored Career Graph conforms to. Changes here are rare and deliberate (a genuine schema migration, e.g., adding a new top-level component).
2. **Instance versioning** (`career_graph_version` and each component's own `version` field) — the ordinary, continuous evolution of one user's data over time. Changes here are constant and expected.

**Auditing:** the combination of append-only Evidence, immutable Reasoning Traces, versioned Skill Nodes, snapshotted Risk/Opportunity State, and the unifying History log means any specific past Decision Engine output should be fully reconstructible and explainable after the fact: which Skill states, which Goal, which Constraint values, and which Risk/Opportunity signals were actually consulted at that moment (via the Reasoning Trace's `inputs_consulted` field, §3.11), cross-referenced against History for corroboration. This is the concrete, whole-object realization of Guiding Principle 17 (everything explainable) — not just for the current moment, but for any moment in the system's operating history.

---

## 6. JSON Example

Abbreviated for readability — omits most Skill Graph nodes (fully specified separately in `skill-graph-schema.md` §8) and shows structural shape rather than exhaustive content.

```json
{
  "metadata": {
    "schema_version": "1.0",
    "career_graph_version": 47,
    "last_full_snapshot_at": "2026-07-01T00:00:00Z"
  },
  "user": {
    "user_id": "u-0001",
    "display_name": "Aditya",
    "timezone": "Asia/Kolkata",
    "created_at": "2026-04-01T00:00:00Z",
    "active_status": "engaged"
  },
  "goals": [
    {
      "goal_id": "g-01",
      "title": "Become employable as an AI Engineer within 12 months",
      "deadline": "2027-04-01",
      "status": "active",
      "priority_weight": 1.0,
      "parent_goal_id": null,
      "source": "onboarding"
    }
  ],
  "constraints": {
    "weekday_hours": { "min": 2, "max": 3 },
    "weekend_hours": { "min": 6, "max": 10 },
    "seasonal_variance": [],
    "hard_deadlines": ["g-01"],
    "competing_obligations": ["Full-time Graduate Engineer Trainee role at Havells"],
    "last_confirmed_at": "2026-04-01T00:00:00Z"
  },
  "skill_graph": {
    "nodes": [
      { "id": "b7e2f1a0-1111-4a2b-9c3d-0000000000a1", "skill_key": "python", "mastery": 0.62, "confidence": 0.71, "status": "practicing" },
      { "id": "b7e2f1a0-2222-4a2b-9c3d-0000000000a2", "skill_key": "linear-algebra", "mastery": 0.45, "confidence": 0.35, "status": "learning" }
    ],
    "dependency_edges_ref": "see skill-graph-schema.md §3 for full edge structure"
  },
  "learning_profile": {
    "style_preference": "build_first",
    "structure_preference": "linear",
    "self_assessment_reliability": {},
    "observed_pace_pattern": null,
    "source": { "style_preference": "declared", "structure_preference": "declared" }
  },
  "domain_advantages": [
    {
      "advantage_id": "da-01",
      "source_background": "Mechanical Engineering (B.Tech)",
      "affected_skill_keys": ["linear-algebra", "calculus", "optimization"],
      "confidence": 0.3,
      "detected_at": "2026-04-01T00:00:00Z",
      "confirmed_by_evidence": false
    }
  ],
  "tasks_missions_quests": {
    "missions": [
      {
        "id": "m-01",
        "title": "Build foundational math-to-ML bridge",
        "status": "active",
        "target_skill_keys": ["linear-algebra", "calculus"],
        "quests": [
          {
            "id": "q-01",
            "title": "Implement core linear algebra operations from scratch",
            "status": "active",
            "tasks": [
              {
                "id": "t-01",
                "title": "Implement matrix multiplication and verify against NumPy",
                "status": "completed",
                "target_skill_keys": ["linear-algebra"],
                "expected_duration": { "min_hours": 2, "max_hours": 4 },
                "completed_at": "2026-06-28T00:00:00Z",
                "evidence_ref": "ev-0201"
              }
            ]
          }
        ]
      }
    ]
  },
  "reflections": [],
  "reasoning_traces_ref": "queried separately by subject_id, not embedded inline in the full object for size reasons",
  "risk_state": {
    "risk_id": "r-014",
    "pace_risk": { "level": "low", "confidence": 0.4 },
    "scope_risk": { "level": "moderate", "confidence": 0.5 },
    "burnout_risk": { "level": "low", "confidence": 0.3 },
    "computed_at": "2026-07-10T00:00:00Z"
  },
  "opportunity_state": null,
  "history_ref": "append-only log queried separately, not embedded inline",
  "notes": "Abbreviated example. Full Skill Graph, complete Reasoning Trace and History records are queried as separate resources, per §7's Postgres mapping — this object shape represents the assembled Career Graph as the Decision Engine would consume it, not necessarily a single literal database row or table."
}
```

---

## 7. Mapping to Implementation Surfaces

### 7.1 Supabase / Postgres
- The Career Graph as shown in §6 is an **assembled view**, not a single table — it maps to a normalized set of tables (`users`, `goals`, `constraints`, `skill_nodes`, `skill_dependencies`, `skill_evidence`, `learning_profiles`, `domain_advantages`, `missions`, `quests`, `tasks`, `reflections`, `reasoning_traces`, `risk_state_snapshots`, `opportunity_state_snapshots`, `history_events`), each scoped by `user_id`, joined at query/API time into the shape shown in §6 when the Decision Engine or UI needs the full picture.
- The append-only components (Evidence, Reasoning Traces, History) should be modeled as insert-only tables at the database level — no `UPDATE` grants on those tables at all, enforced at the RLS/permissions layer, not merely by application-level discipline, since that is the strongest guarantee of the immutability this document repeatedly relies on.
- Risk/Opportunity State as versioned snapshots map naturally to simple append-only tables as well, with "current state" being a `WHERE user_id = ? ORDER BY computed_at DESC LIMIT 1` query rather than a mutable single-row table.
- `career_graph_version` (§3.15) is most simply implemented as a Postgres trigger incrementing a counter on any write to a scoped child table — giving cheap change-detection without requiring the application layer to remember to update it on every write path.
- Row-level security scoped by `user_id` applies uniformly across every table in this model, per `skill-graph-schema.md` §10.1's same reasoning, extended here to the full object.

### 7.2 Decision Engine
- The Decision Engine's Decision Context (`career-intelligence-engine.md` §3.7) is assembled by querying this normalized structure and materializing the request-scoped bundle it actually needs for a given reasoning pass — it never needs the *entire* Career Graph for every decision (e.g., a Task Generation Engine invocation needs Skill Graph + Constraints + active Goals + Risk/Opportunity State + relevant Learning Profile fields, but not the full Reflection or History archives).
- The Planning Engine, specifically, reads Goals + Skill Graph + Constraints to compute the Roadmap (§3.9) — and, critically, writes nothing back to a "Roadmap" table, since none exists; its only persisted write path is materializing a Mission/Quest/Task record when a piece of the computed Roadmap is actually committed to active work (§3.8).

### 7.3 Task Generation Engine
- Reads Skill Graph, Constraints, active Goals, Risk State, Opportunity State, Learning Profile, and recent History/Evidence directly, per `task-generation-engine.md` §2's full input list — nearly every Career Graph component feeds this engine in some form, which is expected, since it is the system's most frequently invoked reasoning surface.
- Writes: new Task records (materializing a Planning Engine Quest slice into concrete, actionable Tasks) and new Reasoning Trace records — never writes directly to Skill Graph `mastery`/`confidence` (that path runs exclusively through Evidence, per `skill-graph-schema.md` §5.4).

### 7.4 Future Multi-User Support
- Every table in §7.1 is already `user_id`-scoped from V1, per Guiding Principle 10 — the schema-level work for multi-user support is therefore largely already done; what's deferred is the *product and access-control* layer (proper authentication beyond a single trusted account, sharing/permission models, any cross-user aggregation).
- The one place multi-user support introduces genuine new schema surface, not just scale, is the Learning Profile's `self_assessment_reliability` field (§3.5) and the Risk/Opportunity Engines' eventual population-level priors (`career-intelligence-engine.md` §8's Year 2–3 phase) — both would need a clearly separated "population-derived prior" data source, distinct from and always overridable by this user's own individual Career Graph data, exactly as that architecture document section specifies. This schema does not yet model that population-prior source, since it has no users to derive it from yet — a deliberate, explicit gap, not an oversight (see §8 below).

---

## 8. Suggested Revisions

- **Formalize the Mission/Quest/Task materialization boundary explicitly in `career-intelligence-engine.md`.** §3.9 above draws a sharp line between the *computed* Roadmap and the *persisted* Mission/Quest/Task records that result when a piece of it is committed to active work — this distinction is implied but not explicitly named in the architecture document's Planning Engine description (§4.2). Recommend adding a short clarifying note there, since without it, an implementing engineer could reasonably (and incorrectly) conclude the Roadmap itself should be a stored table.
- **Add a "Verification Task" glossary term**, as already flagged in `task-generation-engine.md` §13 — this document's Tasks component (§3.8) inherits the same need, since a Task's relationship to Mastery-building versus Confidence-verification is structurally present in the data model (via `target_skill_keys` plus the targeted node's current Mastery/Confidence state) but has no named term anywhere in the product documentation yet.
- **Consider whether Reflections' `derived_updates` pre-confirmation state (§3.10) needs its own explicit sub-schema**, rather than being described here only at the conceptual field level — this is the one component in this document with genuinely multi-step internal state (raw response → system interpretation → user confirmation) that the others don't share, and it may warrant a dedicated short document of its own once the Reflection Engine's implementation begins, similar in spirit to how the Skill Graph earned its own dedicated schema document rather than being fully specified inline here.
- **Explicitly reserve, but do not yet design, the population-prior data source** referenced in §7.4 — flagged here so that whoever eventually designs it does so as a deliberate extension consistent with this document's ownership and provenance discipline (declared vs. inferred vs. population-derived must remain three distinguishable sources, never merged), rather than retrofitting it hastily once multi-user pressure actually arrives.
