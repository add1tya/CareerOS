# Skill Graph Schema

Status: Foundational implementation document. This is the canonical data model — every engineer and AI agent implementing CareerOS's storage, API, or reasoning layer treats this as the schema of record. Changes here are schema migrations, not edits, and must be versioned per §8.

Source-of-truth documents this schema implements: `docs/product/*`, `docs/architecture/career-intelligence-engine.md`, `docs/domain/ai-engineering-knowledge-model.md`. Where a design decision here needed to go beyond what those documents specify, that gap is called out explicitly rather than silently resolved (see §10, Open Questions).

---

## 1. Purpose

A Skill Graph is a directed graph in which nodes represent discrete, individually masterable units of capability, and edges represent prerequisite relationships between them. It is the structural encoding of the `ai-engineering-knowledge-model.md` ontology, instantiated per-user, with each node additionally carrying that specific user's demonstrated Mastery, Confidence, and history in that Skill.

It exists because the Decision Engine (per `career-intelligence-engine.md` §1) is a routing engine, not a curriculum server — and a router requires a map. The Skill Graph *is* that map: the terrain of what the user knows, doesn't yet know, and is structurally capable of learning next, given what they already know. Without a structured graph, "highest expected-value next action" has no computable basis; it would collapse back into either a generic static curriculum or an unstructured, ungrounded LLM opinion — precisely the two failure modes `founder-intent.md` and `vision.md` identify as the reason CareerOS exists.

It is the single source of truth for progress (Guiding Principle 9) for a specific, deliberate reason: every other representation of "how the user is doing" — a dashboard percentage, a streak count, an XP total — must be a *computed view* over this graph, never an independently maintained number. If two features in CareerOS could disagree about whether the user has learned something, that is a schema violation, not a UI inconsistency, and this document exists to make that structurally impossible rather than merely discouraged.

Two things the Skill Graph is explicitly not:
- It is not the Roadmap. The Roadmap (per the architecture document's hard commitment in §1) is always computed fresh from the Skill Graph plus Goals and Constraints; it is never stored as graph state.
- It is not the domain ontology (`ai-engineering-knowledge-model.md`) itself. The ontology is the *seed content*, coarse-grained and user-agnostic. The Skill Graph is the *per-user instantiation*, fine-grained, stateful, and specific to one person's demonstrated Mastery.

---

## 2. Skill Node

A Skill Node represents one discrete, individually verifiable unit of capability for one user. Every field below is required unless explicitly marked optional; optional fields default per the description given.

| Field | Type | Description |
|---|---|---|
| **id** | UUID | Globally unique, immutable identifier for this node instance. Never reused, even after deletion — see §9.2 (Removal). |
| **skill_key** | String (stable slug) | A stable, human-readable identifier tying this node back to its ontology origin (e.g., `pytorch`, `linear-algebra`, `rag`). Distinct from `id`: `skill_key` is shared across all users' instances of "the same" skill, `id` is unique per instance. This is what allows the Decision Engine to reason about a Skill's *general* properties (from the ontology) while `id` scopes it to one user's graph. |
| **user_id** | UUID | The owning user. Present from V1 even with a single user, per `career-intelligence-engine.md`'s architectural commitment to never hard-coding the single-user assumption into the schema. |
| **name** | String | Human-readable display name (e.g., "PyTorch"). Sourced from the ontology at seed time; may be locally overridden if a user-specific framing is ever needed, though this is not expected in V1. |
| **description** | Text | Short explanation of what this Skill actually represents, sourced from the ontology's Purpose field at seed time. |
| **domain** | Enum (cluster) | One of the nine ontology clusters (`programming_systems`, `cs_theory`, `data_backend_infra`, `math`, `core_ml_dl`, `llm_genai_systems`, `evaluation_training_production`, `software_systems_engineering`, `meta_skills`). Used for grouping in visualization and for cluster-level Decision Engine heuristics (e.g., the Specialization-suppression heuristic recommended in `ai-engineering-knowledge-model.md` §6.4). |
| **ontology_category** | Enum | `core`, `advanced`, `specialization`, or `future`, sourced from the ontology's §4 categorization at seed time. A prior for sequencing weight, not a hard rule — the Decision Engine may deviate per-user (e.g., a user's Domain Advantage can promote a `specialization`-tier node earlier than default). |
| **mastery** | Float, 0.0–1.0 | The current estimated level of competence in this Skill for this user. See §5 for the full Mastery Model. Never directly settable by client code — only mutated through the Mastery Model's defined update paths (§5.5–5.6), to preserve auditability. |
| **confidence** | Float, 0.0–1.0 | The system's confidence in the accuracy of the current `mastery` value — distinct from `mastery` itself (per `career-intelligence-engine.md` §3.10: Confidence is about certainty in the estimate, not the magnitude of the estimate). A `mastery` of 0.8 with `confidence` of 0.2 is a materially different state than `mastery` 0.8 with `confidence` 0.9, and both must be independently visible wherever `mastery` is surfaced. |
| **difficulty** | Enum | `low`, `medium`, `high`, `very_high`. Sourced from the ontology's Difficulty field — an intrinsic property of the Skill, not user-specific, and therefore not expected to change per-user (in contrast to `mastery`/`confidence`, which are entirely user-specific). |
| **estimated_hours** | Integer range (min, max) | Sourced from the ontology's Estimated Mastery Time field, as a generic prior. The Decision Engine applies user-specific adjustment (Domain Advantage, observed Learning Velocity) at recommendation time rather than mutating this stored field, keeping the ontology-sourced prior and the personalized estimate cleanly separated. |
| **importance_weight** | Float, 0.0–1.0 | How heavily this Skill's Mastery should be weighted when computing an aggregate Progress Score toward a Goal it's relevant to (per `glossary.md`'s Progress Score definition). Distinct from `difficulty` — a Skill can be easy but highly important (e.g., Git) or hard but narrowly important (e.g., Kubernetes for a solo builder). Set per Goal-relevance relationship, not as a single global property — see §2.1. |
| **transferability** | Enum | `low`, `medium`, `high`, `very_high`, sourced from the ontology. Used by the Decision Engine's Opportunity Model to weight Skills that compound value outside the immediate Goal (e.g., Communication, Linear Algebra). |
| **verification_type** | Enum | The evidence type most appropriate for this Skill, per §7. Sourced from the ontology's "How Mastery Can Be Verified" field at seed time; used to weight incoming Evidence records (§6). |
| **evidence** | Array of Evidence references | The set of Evidence records (§6) that currently support this node's `mastery`/`confidence` values. Never a free-text field — always a structured, queryable list of references to Evidence entities, so the Reasoning Trace can cite specific evidence, not a vague summary. |
| **decay_rate** | Float | The rate at which `confidence` (never `mastery` directly — see §5.3) degrades over time without new Evidence. Sourced from a per-Skill default (domains prone to rapid change, like `llm_genai_systems`, decay faster than stable domains like `linear_algebra`) with room for per-user override if observed forgetting patterns diverge from default. |
| **misconception_discount** | Float, 0.0–1.0 | Sourced from the ontology's Common Misconceptions field, per `ai-engineering-knowledge-model.md` §5.6 — a multiplier applied to self-report Evidence specifically, reflecting how reliable self-assessment tends to be for this particular Skill. A Skill with a well-documented, common self-assessment failure mode (e.g., Prompt Engineering) has a lower discount value than one with typically reliable self-assessment. |
| **created_at** | Timestamp | Node instantiation time (typically, Onboarding Interview completion or a later graph-expansion event). |
| **updated_at** | Timestamp | Last mutation of any field on this node. |
| **version** | Integer | Incremented on every mutation. Used for optimistic concurrency control and for reconstructing history (§9.6). |
| **status** | Enum | The Skill State, per §4 — `locked`, `available`, `learning`, `practicing`, `verified`, `mastered`, `dormant`, `deprecated`. |

### 2.1 Goal-Relevance Relationship

`importance_weight` is not a single scalar property of a Skill Node in isolation — a Skill's importance is always relative to a Goal. This is modeled as a separate join structure (a `skill_goal_relevance` relationship, not a field directly on the Skill Node) linking a Skill Node to a Goal with a weight specific to that pairing. A single Skill (e.g., Communication) can carry a low importance_weight for a narrowly technical Goal and a high importance_weight for a founder-track Goal simultaneously. This is called out explicitly here because it is the one place in this schema where a value that looks like it "belongs" on the Skill Node actually belongs on a relationship between two entities — flattening it onto the node directly would make multi-Goal reasoning structurally impossible.

---

## 3. Dependency Edge

A Dependency Edge represents a prerequisite relationship between two Skill Nodes, corresponding directly to the "Dependencies" and "Unlocks" fields in `ai-engineering-knowledge-model.md`.

| Field | Type | Description |
|---|---|---|
| **id** | UUID | Unique identifier for the edge instance. |
| **parent_skill_id** | UUID | The prerequisite Skill (the source of the edge — must reach the specified minimum Mastery before the child is meaningfully attemptable). |
| **child_skill_id** | UUID | The dependent Skill (the target — the one this edge gates). |
| **minimum_mastery** | Float, 0.0–1.0 | The Mastery threshold on the parent required before the child transitions from `locked` to `available` (see §4). This is the specific numeric calibration flagged as an open task in `ai-engineering-knowledge-model.md` §5.2 — this schema is where that calibration is actually recorded. |
| **weight** | Float, 0.0–1.0 | How strongly the parent's Mastery should influence the child's recommendation priority even above the minimum threshold — distinguishes "just barely unlocked, proceed cautiously" from "deeply mastered prerequisite, full speed ahead" in the Planning Engine's sequencing logic. |
| **type** | Enum | `hard` or `soft` (see below). |
| **rationale** | Text (optional) | Short justification for why this dependency exists, sourced from the ontology entry's prose where available. Primarily for auditability and for future ontology maintainers, not consumed by the Decision Engine directly. |

### 3.1 Hard vs. Soft Dependency

- **Hard Dependency** — the child Skill's `status` is structurally blocked at `locked` (§4) until `minimum_mastery` on the parent is met. Example: Transformers is a hard dependency of LLMs — attempting to reason about LLM behavior without transformer-level understanding produces unreliable Mastery signal even if attempted, per the ontology's own framing of that relationship as foundational, not merely helpful.
- **Soft Dependency** — the child is never blocked by this edge alone; instead, the parent's Mastery contributes positively to the child's recommendation ranking and to the Confidence of any Mastery gained on the child, but a user can attempt and gain some Mastery on the child without it. Example: Statistics is arguably a soft dependency of Prompt Engineering's more rigorous evaluation practices — useful, meaningfully additive, but not strictly blocking.

A Skill Node can have multiple incoming edges of mixed type. A node's `locked`→`available` transition requires **all** Hard Dependencies to meet their `minimum_mastery` threshold; Soft Dependencies never gate this transition, only influence downstream ranking.

---

## 4. Skill State

Skill State is a finite, ordered-with-exceptions state machine. Transitions are system-triggered (based on Mastery/Evidence updates), never directly set by client code, to preserve the same auditability principle as Mastery itself (§2, `mastery` field description).

| State | Meaning | Entry Condition |
|---|---|---|
| **locked** | Not yet attemptable — one or more Hard Dependencies unmet. | Default state for any node whose Hard Dependencies are unmet at creation or re-evaluation. |
| **available** | All Hard Dependencies met; not yet started. | All incoming Hard Dependency edges satisfy `minimum_mastery`, and no Evidence yet recorded. |
| **learning** | Actively being worked on; some Evidence exists but Mastery remains low-confidence and below the `practicing` threshold. | First Evidence record of any type attached to the node. |
| **practicing** | Meaningful, repeated engagement; Mastery is rising but not yet independently verified by a high-tier Evidence type (§7). | Mastery crosses a system-configured practicing threshold (default 0.4) via non-verification-tier Evidence. |
| **verified** | Mastery has been confirmed by at least one Artifact-tier or higher Evidence record (§7), meeting a system-configured verified threshold (default 0.7). | A qualifying Evidence record is recorded and pushes Mastery/Confidence past threshold. |
| **mastered** | Sustained, high-confidence competence — the ceiling state for active use. | Mastery ≥ 0.9 and Confidence ≥ 0.8, sustained (not merely momentarily crossed) across a system-configured stability window. |
| **dormant** | Was previously `practicing`, `verified`, or `mastered`, but `confidence` has decayed below a usable threshold due to elapsed time without new Evidence (§5.3). | Automatic transition via the decay process — never a direct user action. |
| **deprecated** | The Skill itself (not the user's Mastery of it) has been retired from the active ontology — e.g., a superseded framework or an ontology restructure (§9.5). | Only triggered by a Graph Operation (§9), never by Mastery/Evidence changes. |

### 4.1 Notes on Transitions

- `dormant` is a state about **decay of confidence in stale information**, not a state about **loss of underlying capability** — the schema deliberately does not model "forgetting" as a reduction in the `mastery` value itself (see §5.3's rationale). A `dormant` node's `mastery` value is preserved as-is; only its `confidence` has degraded, and re-engagement (fresh Evidence) restores confidence quickly rather than requiring Mastery to be rebuilt from zero.
- `deprecated` is orthogonal to a user's personal progress — it reflects the ontology itself changing (e.g., TensorFlow's relative importance declining, per its own entry's Common Misconceptions framing, could eventually justify deprecating it as an actively-recommended node while preserving historical Evidence for audit purposes).
- There is no direct `mastered` → `learning` transition. Regression in demonstrated capability is modeled as `confidence` decay toward `dormant`, never as a `mastery` rollback, preserving the principle that Mastery reflects a floor of demonstrated capability at some point in time, not a a real-time-only snapshot.

---

## 5. Mastery Model

### 5.1 Mastery Scale
Continuous float, 0.0 (no demonstrated capability) to 1.0 (elite-level, sustained mastery). Not a discrete tier system at the storage layer — discrete labels (`locked` through `mastered`) are derived *display and reasoning states*, computed from the continuous value plus Confidence, not the underlying source of truth. This preserves precision for the Decision Engine's ranking logic, which needs finer granularity than eight buckets to correctly compare two nearly-equal-priority Skills.

### 5.2 Confidence Scale
Continuous float, 0.0 (no basis for the Mastery estimate) to 1.0 (extensively verified, recent, high-tier evidence). Confidence is never allowed to exceed the ceiling implied by the highest-tier Evidence type currently attached (§7) — a node with only Self Report evidence cannot report Confidence above that tier's ceiling, regardless of how many low-tier Evidence records accumulate. This directly implements the architecture document's Confidence-composition principle (`career-intelligence-engine.md` §6): confidence inherits the floor of its weakest structurally-required input, and Evidence tier is exactly that floor.

### 5.3 Decay
Only `confidence` decays over time without new Evidence — `mastery` itself does not automatically decrease. This is a deliberate design choice: demonstrated capability at a point in time is a historical fact and should not be silently erased by the passage of time alone, but the *system's certainty that the capability is still current* legitimately should degrade — a Skill last verified two years ago, in a fast-moving cluster like `llm_genai_systems`, genuinely warrants lower confidence today even though the user's underlying capability may well be intact or improved. Decay is computed continuously as a function of `decay_rate` and time-since-last-Evidence, not as a periodic batch job, so `confidence` reads correctly at any query time without requiring a scheduled recomputation.

### 5.4 Verification
See §7 for the full hierarchy. In brief: every Mastery/Confidence update must be attributable to at least one Evidence record; there is no direct-write path to `mastery` or `confidence` that bypasses Evidence, even for administrative correction (administrative correction is itself modeled as a special Evidence type — see §6).

### 5.5 Overrides
When a user explicitly disagrees with a system-computed Mastery estimate (e.g., "I actually know this better than 0.4 suggests"), this is recorded as a distinct Evidence record of type `self_report_override`, not as a silent overwrite of the existing value. Per Guiding Principle 18 (overrides are signal, not errors), an override does not simply replace the prior estimate — it is weighted per the standard Evidence-aggregation logic like any other Self Report evidence (§7), meaning a single override moves the estimate proportionally to Self Report's tier weight, not to 100% of the stated value. If overrides on a given Skill are frequent and consistent in direction, that pattern itself becomes a signal to the Learning Profile that the node's `misconception_discount` or the ontology's underlying assumptions may need review (feeding back into `ai-engineering-knowledge-model.md` maintenance, per that document's §5 closing note).

### 5.6 How Mastery Increases
Mastery increases when a new Evidence record is added whose implied Mastery value (a function of the Evidence type's tier and its specific content, e.g., project complexity or quiz score) exceeds the current stored value, using a weighted-update formula rather than a direct overwrite: the new estimate is blended with the existing value, weighted by the *relative Confidence* of the new Evidence versus the existing Confidence — high-tier, high-confidence new Evidence can move Mastery sharply; low-tier Evidence nudges it only slightly, even if the raw implied value is high. This is what prevents a single generous self-assessment from producing an unjustified jump in stored Mastery.

### 5.7 How Mastery Decreases
Mastery itself, per §5.3, is not directly decreased by time. It can decrease in two narrower circumstances: (1) an explicit correction Evidence record (e.g., a failed verification attempt, such as a Boss Battle attempt that reveals a gap — see §6), which is itself just another Evidence record processed through the same weighted-update formula as an increase, only pulling the value down; or (2) an administrative correction (§5.4) used only for genuine data-entry errors, logged distinctly from ordinary Evidence for audit clarity. There is no "natural forgetting" decrease path for `mastery` — only for `confidence`, per §5.3's rationale.

---

## 6. Evidence Model

Evidence is the atomic unit of proof behind every Mastery/Confidence change. Every Evidence record references exactly one Skill Node (or, for composite artifacts touching multiple Skills, one record per Skill affected, all referencing a shared parent artifact).

| Evidence Type | What It Represents | Effect on Confidence |
|---|---|---|
| **Completed Project** | A real, working, inspectable built artifact demonstrating applied use of the Skill. | Large increase — the highest-weight non-external-validation Evidence type, consistent with the "build to learn" philosophy's emphasis on artifacts over passive consumption. |
| **Quiz** | A structured, scored assessment of conceptual knowledge. | Moderate increase — strong for verifying conceptual understanding specifically, weaker for verifying applied capability, so its contribution is capped below Project-tier regardless of score. |
| **Interview** (mock or real technical interview performance) | Real-time, unscripted demonstration under pressure, self- or system-assessed. | Moderate-to-large increase depending on structure and whether externally assessed; treated as approaching External Validation tier when conducted by a qualified third party. |
| **Reflection** | Free-text, user-authored reflection on their own understanding or a recent experience. | Small increase, and primarily useful for updating the Learning Profile (qualitative context) rather than moving Mastery directly — reflects the architecture's treatment of Reflection as input to the Reflection Engine, not a Mastery-verification mechanism in itself. |
| **Code Review** | Structured feedback received on real code from another engineer. | Moderate-to-large increase, weighted by the reviewer's apparent expertise where known (unstructured/anonymous review weighted conservatively). |
| **GitHub Activity** | Externally observable commit/PR/contribution activity. | Small-to-moderate increase on its own (activity is a weak proxy for competence); primarily used as corroborating signal alongside a Completed Project record rather than as standalone strong evidence. |
| **Course Completion** | Finishing a structured course or curriculum module. | Small increase — explicitly the lowest-weighted non-self-report tier, consistent with the ontology's repeated Common Misconceptions warning against equating course completion with real competence. |
| **Boss Battle** | A significant, higher-stakes checkpoint Quest completed under demanding, close-to-real conditions (per `glossary.md`). | Large increase — deliberately calibrated near Completed Project tier, since a Boss Battle is explicitly designed as a genuine capability checkpoint, not a routine gamification mechanic. |
| **Portfolio** | A curated collection of prior artifacts presented together, typically at Reflection/Milestone checkpoints. | Small-to-moderate increase on its own; functions more as an aggregation/re-surfacing of existing Evidence than as new proof, so it should not double-count Confidence already granted by the underlying artifacts. |
| **Self Report** (baseline, including Onboarding responses) | The user's own unverified statement of their competence. | Smallest increase of any tier, and the only tier subject to the `misconception_discount` multiplier (§2). Necessary and legitimate as an initial seed (Onboarding has nothing else to go on), but structurally the weakest possible evidence. |
| **Self Report Override** | An explicit user disagreement with a system estimate (§5.5). | Treated identically to Self Report in weighting; distinguished only for audit/signal purposes (§5.5), not given elevated trust merely for being an explicit correction. |
| **External Validation** (e.g., a real job offer, a certification from a reputable external body, a paid freelance engagement) | Confirmation of competence by an unaffiliated third party with real stakes in the assessment. | Largest possible single increase — the only tier capable of pushing Confidence to its maximum ceiling on its own. |
| **Mentor Validation** (an assessment from the AI Mentor itself, following a structured Mentor Chat evaluation) | The Mentor Engine's own structured judgment of demonstrated competence during a conversation (e.g., the user correctly explaining a concept under Socratic questioning). | Moderate increase — deliberately capped below Completed Project and External Validation tiers, since the Mentor Engine's assessment, however well-grounded, is still model-based judgment rather than a real-world artifact or independent third party. |

Every Evidence record additionally stores: `id`, `skill_id`, `user_id`, `type` (from the table above), `content_ref` (link to the actual artifact/quiz result/reflection text, stored elsewhere), `implied_mastery` (the raw value this specific piece of evidence suggests, before weighted blending), `recorded_at`, and `source` (system-generated vs. user-submitted, for audit purposes).

---

## 7. Verification Types

A four-tier hierarchy governing the *ceiling* Confidence any Evidence type can contribute toward, referenced by §5.2's Confidence-ceiling rule.

```
Tier 1: Self Report
  └─▶ Tier 2: Artifact           (Course Completion, Quiz, Reflection, Portfolio)
        └─▶ Tier 3: Project       (Completed Project, Boss Battle, Code Review, GitHub Activity)
              └─▶ Tier 4a: Mentor Validation
              └─▶ Tier 4b: External Validation   (highest ceiling)
```

- **Tier 1 — Self Report:** Confidence ceiling ≈ 0.3. Necessary for Onboarding seeding and ongoing self-assessment, but structurally the least trustworthy tier, and the only one subject to `misconception_discount`.
- **Tier 2 — Artifact:** Confidence ceiling ≈ 0.55. Structured, externally-checkable artifacts (a quiz score, a completed course) that provide more signal than pure self-report but still fall short of demonstrating applied capability.
- **Tier 3 — Project:** Confidence ceiling ≈ 0.85. Real, working, inspectable artifacts — the tier the "build to learn" philosophy is most explicitly designed to produce evidence at, and the tier most Mastery in this system should ultimately rest on.
- **Tier 4 — Mentor / External Validation:** Confidence ceiling = 1.0. External Validation (independent third party, real stakes) is unambiguously the strongest possible evidence. Mentor Validation is grouped at the same tier level but is explicitly documented (§6) as capped slightly lower in *practice* by its per-type weighting even though it shares the tier's ceiling — the tier structure sets the theoretical maximum; the per-type weighting table in §6 governs typical practical contribution.

A node's `confidence` can never exceed the ceiling of the highest tier among its attached Evidence records, regardless of how many lower-tier records accumulate — ten Self Report entries do not sum to one Project-tier entry's ceiling. This non-additive ceiling rule is the direct schema-level implementation of the architecture document's confidence-composition principle.

---

## 8. JSON Examples

The following are illustrative Skill Node instances (abbreviated Evidence arrays for readability) for a hypothetical user with a mechanical engineering Domain Advantage, consistent with the founder's own profile.

### 8.1 Python

```json
{
  "id": "b7e2f1a0-1111-4a2b-9c3d-0000000000a1",
  "skill_key": "python",
  "user_id": "u-0001",
  "name": "Python",
  "description": "The primary implementation language for AI engineering work.",
  "domain": "programming_systems",
  "ontology_category": "core",
  "mastery": 0.62,
  "confidence": 0.71,
  "difficulty": "medium",
  "estimated_hours": { "min": 150, "max": 250 },
  "transferability": "very_high",
  "verification_type": "project",
  "evidence": [
    { "evidence_id": "ev-0091", "type": "completed_project", "implied_mastery": 0.6, "recorded_at": "2026-05-12T00:00:00Z" },
    { "evidence_id": "ev-0104", "type": "github_activity", "implied_mastery": 0.55, "recorded_at": "2026-06-30T00:00:00Z" }
  ],
  "decay_rate": 0.02,
  "misconception_discount": 0.6,
  "created_at": "2026-04-01T00:00:00Z",
  "updated_at": "2026-06-30T00:00:00Z",
  "version": 4,
  "status": "practicing"
}
```

### 8.2 Linear Algebra

```json
{
  "id": "b7e2f1a0-2222-4a2b-9c3d-0000000000a2",
  "skill_key": "linear-algebra",
  "user_id": "u-0001",
  "name": "Linear Algebra",
  "description": "The mathematical language of vectors, matrices, and transformations underlying modern ML.",
  "domain": "math",
  "ontology_category": "core",
  "mastery": 0.45,
  "confidence": 0.35,
  "difficulty": "high",
  "estimated_hours": { "min": 100, "max": 150 },
  "transferability": "high",
  "verification_type": "project",
  "evidence": [
    { "evidence_id": "ev-0012", "type": "self_report", "implied_mastery": 0.5, "recorded_at": "2026-04-01T00:00:00Z", "source": "onboarding_interview" }
  ],
  "decay_rate": 0.01,
  "misconception_discount": 0.7,
  "created_at": "2026-04-01T00:00:00Z",
  "updated_at": "2026-04-01T00:00:00Z",
  "version": 1,
  "status": "learning",
  "notes": "Mastery seeded above ontology default at Onboarding due to detected Domain Advantage (mechanical engineering background). Confidence intentionally low — Tier 1 evidence only, per §7 ceiling rule."
}
```

### 8.3 PyTorch

```json
{
  "id": "b7e2f1a0-3333-4a2b-9c3d-0000000000a3",
  "skill_key": "pytorch",
  "user_id": "u-0001",
  "name": "PyTorch",
  "description": "The dominant practical framework for implementing, training, and experimenting with deep learning models.",
  "domain": "core_ml_dl",
  "ontology_category": "core",
  "mastery": 0.0,
  "confidence": 0.0,
  "difficulty": "medium",
  "estimated_hours": { "min": 80, "max": 120 },
  "transferability": "high",
  "verification_type": "project",
  "evidence": [],
  "decay_rate": 0.03,
  "misconception_discount": 0.5,
  "created_at": "2026-04-01T00:00:00Z",
  "updated_at": "2026-04-01T00:00:00Z",
  "version": 1,
  "status": "locked",
  "blocking_dependencies": ["deep-learning-fundamentals"]
}
```

### 8.4 RAG (Retrieval-Augmented Generation)

```json
{
  "id": "b7e2f1a0-4444-4a2b-9c3d-0000000000a4",
  "skill_key": "rag",
  "user_id": "u-0001",
  "name": "Retrieval-Augmented Generation (RAG)",
  "description": "Combining retrieval systems with generative models to produce grounded, source-attributable outputs.",
  "domain": "llm_genai_systems",
  "ontology_category": "advanced",
  "mastery": 0.0,
  "confidence": 0.0,
  "difficulty": "high",
  "estimated_hours": { "min": 60, "max": 100 },
  "transferability": "medium",
  "verification_type": "project",
  "evidence": [],
  "decay_rate": 0.08,
  "misconception_discount": 0.55,
  "created_at": "2026-04-01T00:00:00Z",
  "updated_at": "2026-04-01T00:00:00Z",
  "version": 1,
  "status": "locked",
  "blocking_dependencies": ["embeddings", "vector-databases", "prompt-engineering", "llms"],
  "notes": "Highest decay_rate example in this document — llm_genai_systems cluster, consistent with ai-engineering-knowledge-model.md's note that this cluster moves fastest and should be re-reviewed most frequently."
}
```

---

## 9. Graph Operations

### 9.1 Adding Nodes
New Skill Nodes are added in two circumstances: (1) initial Onboarding, instantiating the full ontology-seeded node set (typically `locked` or `available` per Dependency evaluation) for a new user; (2) an ontology update introducing a genuinely new Skill (e.g., a new technique emerging in the fast-moving `llm_genai_systems` cluster). In case (2), the new node is added to all existing users' graphs at `locked`/`available` status per their current Dependency states, never retroactively marked as having any Mastery, even if the user's other Evidence would plausibly imply some.

### 9.2 Removing Nodes
Skill Nodes are never hard-deleted. "Removal" from active use is always represented as a transition to `deprecated` status (§4), preserving the full Evidence history for audit and for any future re-activation. This mirrors the immutable-`id` policy in §2 — historical integrity of what a user actually demonstrated is treated as more important than a tidy active node list.

### 9.3 Splitting
When an ontology domain is judged too coarse (e.g., "Machine Learning" splitting into finer nodes as recommended in `ai-engineering-knowledge-model.md` §5.1), the original node is `deprecated`, and new child nodes are created with Evidence records that reference the original node's Evidence by lineage (a `derived_from_skill_id` pointer) so that pre-split proof of capability is not lost, only re-attributed at finer granularity. The new nodes' initial Mastery/Confidence are seeded conservatively from the parent's values, discounted, since a coarse-grained Mastery value does not evenly imply mastery of every fine-grained sub-skill.

### 9.4 Merging
The inverse of Splitting: when two previously-distinct nodes are judged to represent the same actual capability (e.g., an ontology revision collapsing a previously over-split pair), both original nodes are `deprecated`, a new merged node is created, and its initial Mastery/Confidence are computed as the Evidence-weighted combination of both originals' full Evidence histories — not a simple average, since one original may have had substantially stronger Evidence than the other.

### 9.5 Deprecating
Used when the ontology itself retires a Skill's relevance (e.g., a superseded framework). The node transitions to `deprecated`; its historical Mastery/Evidence remain queryable but the node is excluded from active Decision Engine recommendation and from default Skill Tree visualization, with an option to reveal deprecated nodes explicitly (relevant for a user reviewing their own learning history over years).

### 9.6 Versioning
Every mutation increments `version` (§2) and is expected to write an append-only history record (a `skill_node_history` table conceptually, storing the prior state at each version bump) rather than only updating in place. This is what makes the Reasoning Trace (per `career-intelligence-engine.md` §3.7) auditable after the fact — "why did the Decision Engine recommend this on this date" must be answerable against the Skill Graph state *as it existed at that time*, not the current state.

---

## 10. Mapping to Implementation Surfaces

### 10.1 Supabase / Postgres

> **Implemented mapping (M4, ADR-0001).** As of Sprint 4 the Skill Graph is
> stored as a **global ontology + per-user overlay**, not a single per-user
> `skill_nodes` table. The per-user `skill_nodes` description below is retained
> as historical context; the tables actually implemented are:
> - `skills` — GLOBAL, user-agnostic ontology rows (keyed by immutable
>   `skill_key`; includes `domain`, `ontology_category`, `difficulty`,
>   `estimated_hours_min/max`, `transferability`, `display_order`,
>   `ontology_version`). Read-only reference data.
> - `skill_dependencies` — GLOBAL edges referencing `parent_skill_key` /
>   `child_skill_key` (no `user_id` scope; edges are ontology-level, shared).
> - `user_skill_mastery` — PER-USER overlay keyed by (`user_id`, `skill_key`),
>   holding `mastery`, `confidence`, `status`, `source`. RLS-scoped own-row.
>
> `skill_key` is an immutable identifier and must never change once introduced
> (ADR-0001). Evidence, `skill_node_history`, weighted mastery updates, and
> confidence decay remain deferred (unchanged intent, not yet implemented).

- Skill Nodes map to a `skill_nodes` table, with `user_id` and `skill_key` jointly indexed (the common lookup pattern: "this user's instance of this ontology skill").
- Dependency Edges map to a `skill_dependencies` table with `parent_skill_id`/`child_skill_id` foreign keys into `skill_nodes`; since edges are defined at the ontology level but instantiated per-user-graph, edges should reference nodes within the same `user_id` scope — never cross-user edges.
- Evidence maps to a `skill_evidence` table, foreign-keyed to `skill_nodes`, append-only (no updates, only inserts — consistent with §9.6's audit requirement).
- The `skill_node_history` table (§9.6) is a straightforward append-only log, foreign-keyed to `skill_nodes.id`, storing a full snapshot or diff at each `version` increment.
- Row-level security should scope every table by `user_id` from V1, even with one user, per the same reasoning as the `user_id` field itself (§2) — retrofitting RLS later is expensive; specifying it now is free.
- Postgres's native graph-adjacency query support (recursive CTEs) is sufficient for V1's traversal needs (finding all `locked` nodes whose Hard Dependencies just became satisfied, computing reachability for the Planning Engine); a dedicated graph database is explicitly not justified at V1 scale, per Guiding Principle 7.

### 10.2 Network Graph Visualization (Skill Tree)
- The Skill Tree UI component (per `glossary.md`'s distinction between Skill Graph as data and Skill Tree as its visualization) consumes a read-only, denormalized projection of `skill_nodes` + `skill_dependencies`, typically filtered to non-`deprecated` nodes and colored/sized by `status`, `mastery`, and `domain` cluster.
- `ontology_category` (Core/Advanced/Specialization/Future) is a natural candidate for visual grouping or layout tiering, giving the Skill Tree the same coarse structure as `ai-engineering-knowledge-model.md` §4's table.
- `confidence` should be visually distinct from `mastery` in any rendering (e.g., fill opacity or a separate indicator) — collapsing them into one visual dimension would violate the product philosophy's transparency commitment (Guiding Principle 19) by hiding genuine uncertainty from the user.

### 10.3 Decision Engine
- The Planning Engine (per `career-intelligence-engine.md` §4.2) queries `skill_nodes` filtered to `available`/`learning`/`practicing` status, joined against `skill_dependencies`, to compute which nodes are legitimately reachable next — this is the direct implementation of the "map" the architecture document's routing-engine mental model depends on.
- The Recommendation Engine (§4.9 of the architecture doc) reads `mastery`, `confidence`, `importance_weight` (via the Goal-relevance relationship, §2.1), and `decay_rate`-adjusted current confidence to rank candidate Tasks, attaching the specific Evidence and Dependency edges consulted as the stored Reasoning Trace.
- The Reflection Engine (§4.4) writes new Evidence records and proposes Mastery/Confidence updates via the weighted-update formula (§5.6), surfaced to the user for confirmation before being committed — never writing directly to `mastery`/`confidence` without an Evidence record justifying the change, per §5.4.
- The Risk Engine (§4.8) reads `decay_rate`-projected confidence trends across the graph to detect emerging pace or staleness risk, distinct from Mastery-level risk.

---

## 11. Open Questions

- **Calibration of `minimum_mastery` thresholds on Dependency Edges.** This schema defines the field; the actual numeric values across the full ontology graph are not yet set and require either domain-expert judgment or empirical calibration against real usage data once the system has enough history to observe whether thresholds are too strict or too lenient.
- **Cross-Goal `importance_weight` conflicts.** When a Skill is highly important to one active Goal and irrelevant to another, and both Goals are active simultaneously, the aggregation rule for Recommendation ranking is not yet specified — a candidate for the Decision Engine's design, not this schema, but flagged here since the underlying data model (§2.1) needs to support whatever rule is eventually chosen.
- **Decay rate defaults per domain cluster.** §5.3 establishes that decay rates should vary by cluster (fast for `llm_genai_systems`, slow for `math`), but the specific default values per cluster are placeholders in the JSON examples above (§8.4's 0.08 vs. §8.2's 0.01) and need deliberate calibration, likely informed by how quickly the underlying ontology itself is observed to change.
- **Whether Mentor Validation should be split into its own tier below External Validation**, given §7's acknowledgment that it shares a nominal tier ceiling with External Validation but is weighted lower in practice (§6) — the current design tolerates this inconsistency for schema simplicity, but a future revision might formalize Tier 4a/4b as genuinely distinct ceiling tiers rather than same-tier-different-weight.

## 12. Tradeoffs

- **Continuous Mastery/Confidence floats vs. discrete tiers at the storage layer:** chosen for ranking precision (§5.1), at the cost of requiring every consuming surface (UI, Decision Engine) to independently derive human-readable state, rather than reading a simple enum directly. Mitigated by `status` being maintained as a computed-but-stored derived field, giving consumers a fast path when they don't need the raw floats.
- **Append-only Evidence and versioned history vs. simpler in-place mutation:** chosen for auditability of the Reasoning Trace (§9.6), at the cost of greater storage volume and query complexity over time. Judged worthwhile given the product's core promise depends on every recommendation being explainable after the fact, not just at the moment it was made.
- **Never auto-decreasing `mastery`, only `confidence`:** chosen to preserve historical integrity of demonstrated capability (§5.3), at the cost of a small risk that a genuinely regressed user (who has actually lost a skill through prolonged disuse) has their `mastery` value read as more current than it truly is. Mitigated by `confidence` decay making this explicit and visible rather than silently hidden, and by the Recovery Engine's explicit handling of large gaps.
- **Single-database (Postgres/Supabase) graph representation vs. a dedicated graph database:** chosen for V1 simplicity per Guiding Principle 7, at the cost of needing recursive CTEs for deep traversal queries, which are less ergonomic than native graph query languages. Explicitly flagged as revisitable if graph depth/complexity grows substantially in later evolution phases (`career-intelligence-engine.md` §8).

## 13. Future Improvements

- **Population-level Dependency threshold calibration**, once a multi-user population exists (per the architecture document's Year 2–3 evolution phase), replacing hand-set `minimum_mastery` defaults with empirically observed values, while preserving individual override per the same principle guarding population priors in `career-intelligence-engine.md` §8.
- **A genuine Knowledge Graph layer** (per `ai-engineering-knowledge-model.md` §2.6's reserved-but-unpopulated Knowledge Graph concept), separating general domain content from per-user Skill instances more cleanly than the current `skill_key`-as-loose-link approach, if content richness grows enough to justify it.
- **Formal schema migration tooling** for Splitting/Merging operations (§9.3–9.4), which are currently specified at the conceptual data-model level in this document but will need concrete tooling support once the ontology has undergone its first real revision cycle.
- **Richer Evidence content modeling** (e.g., structured rubrics for Code Review or Interview evidence, rather than a single `implied_mastery` scalar), if the weighted-update formula (§5.6) proves too coarse once more Evidence volume accumulates.
