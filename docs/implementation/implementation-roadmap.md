# CareerOS Implementation Roadmap

Status: Authoritative implementation plan derived from the full `docs/` specification set. This document extracts requirements, data models, entities, relationships, and architectural decisions from source documentation — it does not replace those documents.

**Source documents consumed:**

| Path | Role |
|---|---|
| `docs/product/vision.md` | V1 scope, success metrics, 8-week MVP target |
| `docs/product/founder-intent.md` | Founder constraints, success definition |
| `docs/product/product-philosophy.md` | AI-first, honesty, build-to-learn, transparency |
| `docs/product/guiding-principles.md` | Engineering constraints (31 principles) |
| `docs/product/glossary.md` | Canonical domain vocabulary |
| `docs/product/onboarding-intelligence.md` | Onboarding interview specification |
| `docs/architecture/career-intelligence-engine.md` | Decision Engine architecture, engines, V1 scope |
| `docs/architecture/task-generation-engine.md` | Task Generation Engine pipeline and contracts |
| `docs/domain/ai-engineering-knowledge-model.md` | Domain ontology (seed content) |
| `docs/domain/skill-graph-schema.md` | Skill Graph data model |
| `docs/domain/career-graph-schema.md` | Career Graph conceptual model and Postgres mapping |

---

## Extracted Specification

The following sections catalog everything required for implementation. Each item traces to one or more source documents above.

---

### A. Implementation Requirements

#### A.1 Product — V1 In Scope

| ID | Requirement | Source |
|---|---|---|
| PR-01 | Onboarding Interview: structured conversational intake producing initial Career Graph | `vision.md`, `onboarding-intelligence.md` |
| PR-02 | Progressive onboarding in 3 phases (Required → Strongly Encouraged → Optional) | `onboarding-intelligence.md` §6–7 |
| PR-03 | Minimum Required questions (Q1, Q3, Q4, Q6, Q7) block Career Graph generation until complete | `onboarding-intelligence.md` §6 |
| PR-04 | Confidence scoring on every onboarding answer (Specificity + Verifiability, Tier 1 ceiling) | `onboarding-intelligence.md` §10 |
| PR-05 | Domain Advantage detection and explicit user surfacing at onboarding | `onboarding-intelligence.md` §11 |
| PR-06 | Goal validation (structural, coherence, feasibility) before Career Graph generation | `onboarding-intelligence.md` §13 |
| PR-07 | Timeline realism checking with honest gap surfacing | `onboarding-intelligence.md` §9, §16 |
| PR-08 | Initial Career Graph generation in fixed 7-step sequence | `onboarding-intelligence.md` §19 |
| PR-09 | Initial Skill Graph seeding from ontology with Tier 1/2/3 evidence rules | `onboarding-intelligence.md` §20 |
| PR-10 | Initial Roadmap computation + Day 1 Task delivery (no review gate) | `onboarding-intelligence.md` §21 |
| PR-11 | Skill Graph visualization (Skill Tree UI) | `vision.md`, `glossary.md` |
| PR-12 | Daily Task Engine: single highest-value Task recommendation with alternatives | `vision.md`, `task-generation-engine.md` §3 |
| PR-13 | Mentor Chat: grounded LLM interface over Career Graph | `vision.md`, `career-intelligence-engine.md` §4.6 |
| PR-14 | User promise: every recommendation grounded, explainable, adaptive | `vision.md` §User Promise |
| PR-15 | Overrides logged as signal, not errors | `guiding-principles.md` #18 |
| PR-16 | Recovery flow on streak break / long absence (re-engagement, not shame) | `career-intelligence-engine.md` §4.5, `task-generation-engine.md` §8 |
| PR-17 | Reflection: user-initiated only in V1; proposed Mastery updates require confirmation | `career-intelligence-engine.md` §7 |
| PR-18 | Risk assessment surfaced honestly (pace, scope, burnout) | `career-intelligence-engine.md` §4.8 |
| PR-19 | Full user data export in plain readable format | `guiding-principles.md` #27 |
| PR-20 | Founder daily-use adherence as primary success metric | `founder-intent.md` §3 |

#### A.2 Product — V1 Explicitly Out of Scope

| ID | Exclusion | Source |
|---|---|---|
| EX-01 | Multi-user auth complexity beyond Supabase defaults | `vision.md` |
| EX-02 | Monetization, billing, subscription | `vision.md` |
| EX-03 | Public marketing site | `vision.md` |
| EX-04 | Native mobile app (responsive web sufficient) | `vision.md` |
| EX-05 | External integrations (LinkedIn, job boards, resume tools) | `vision.md` |
| EX-06 | Team/enterprise features | `vision.md` |
| EX-07 | Push notifications beyond in-app state | `vision.md` |
| EX-08 | Calendar integration | `career-intelligence-engine.md` §7 |
| EX-09 | Full Opportunity Engine (stub: constraint-change unlock only) | `career-intelligence-engine.md` §7 |
| EX-10 | Standalone Prediction Engine (linear trend in Risk Engine) | `career-intelligence-engine.md` §7 |
| EX-11 | Automatic Milestone/Reflection triggering | `career-intelligence-engine.md` §7 |
| EX-12 | LLM-generated Task candidates from scratch | `task-generation-engine.md` §5.2, §10 |
| EX-13 | Cross-user Learning Profile calibration | `career-intelligence-engine.md` §7 |
| EX-14 | Knowledge Graph as separate entity | `career-intelligence-engine.md` §3.4 |
| EX-15 | Social/peer comparison, job-posting data, biometric inputs | `career-intelligence-engine.md` §2.4 |

#### A.3 Architecture — Hard Commitments

| ID | Requirement | Source |
|---|---|---|
| AR-01 | Roadmap is **computed**, never persisted as source of truth | `career-intelligence-engine.md` §1, `career-graph-schema.md` §3.9 |
| AR-02 | Missions/Quests/Tasks are **persisted** when committed to active work | `career-graph-schema.md` §3.8 |
| AR-03 | Skill Graph is single source of truth for progress | `guiding-principles.md` #9 |
| AR-04 | Mastery/Confidence mutate only via Evidence records | `skill-graph-schema.md` §5.4 |
| AR-05 | Reasoning Traces stored immutably at recommendation time | `guiding-principles.md` #11, `task-generation-engine.md` §3 |
| AR-06 | Decision Context is ephemeral; may cache briefly keyed on `career_graph_version` | `career-graph-schema.md` §4 |
| AR-07 | Confidence inherits floor of weakest input (composition rule) | `career-intelligence-engine.md` §6 |
| AR-08 | Task Generation Engine is deterministic given identical input state | `task-generation-engine.md` §9 |
| AR-09 | Template Library (ontology Suggested Projects) is V1 candidate source | `task-generation-engine.md` §5.1, §5.3 |
| AR-10 | Claude used narrowly: template personalization + Reasoning Trace prose only in V1 | `task-generation-engine.md` §10 |
| AR-11 | Planning Engine recomputation triggers: Goal change, material Constraint change | `task-generation-engine.md` §8 |
| AR-12 | Strict top-down engine orchestration (no peer engine calls) | `career-intelligence-engine.md` §4.1 |
| AR-13 | Fail loud on AI/API failures — no silent stale fallback | `guiding-principles.md` #13 |
| AR-14 | Idempotent, auditable AI calls that mutate state | `guiding-principles.md` #12 |
| AR-15 | Append-only: Evidence, Reasoning Traces, History | `career-graph-schema.md` §4 |
| AR-16 | RLS on all tables scoped by `user_id` from V1 | `skill-graph-schema.md` §10.1, `career-graph-schema.md` §7.1 |
| AR-17 | Schema versioning for Skill Graph taxonomy | `guiding-principles.md` #14 |
| AR-18 | Default architecture: single Next.js app + Supabase + Claude until proven otherwise | `guiding-principles.md` #7 |

#### A.4 Task Generation Engine — Pipeline Requirements

| Stage | Requirement | Source |
|---|---|---|
| Observe | Ingest Evidence, elapsed time, user daily input since last invocation | `task-generation-engine.md` §4 |
| Update User State | Recompute Momentum, Confidence decay projections | `task-generation-engine.md` §4 |
| Identify Skill Gaps | Goal-relevant nodes below Mastery or Confidence threshold | `task-generation-engine.md` §4 |
| Evaluate Dependencies | Hard deps gate `locked` nodes; soft deps influence ranking | `task-generation-engine.md` §4 |
| Generate Candidates | Template Library + hybrid LLM personalization | `task-generation-engine.md` §5 |
| Filter Impossible | Time budget, tool access, recent override suppression | `task-generation-engine.md` §4 |
| Score Candidates | Multi-factor per §6.1 weighting philosophy | `task-generation-engine.md` §6 |
| Risk Adjustment | Visible, explainable reprioritization when risk elevated | `task-generation-engine.md` §4 |
| Opportunity Adjustment | Rare injection/boost from Opportunity Engine stub | `task-generation-engine.md` §4 |
| Select | Top Task + 2–3 Alternatives with comparative rejection reasons | `task-generation-engine.md` §3 |
| Generate Trace | Grounded trace answering 5 explainability questions | `task-generation-engine.md` §7 |
| Present | Persist output + traces | `task-generation-engine.md` §4 |

#### A.5 Task Generation Engine — Output Contract

Required fields per invocation: `Recommended Task`, `Reasoning Trace`, `Expected Duration` (range), `Priority Score`, `Confidence Score`, `Alternative Tasks` (2–3), `Why Rejected`, `Required Skills`, `Expected Mastery Gain`, `Evidence Type`.

Source: `task-generation-engine.md` §3.

#### A.6 Onboarding — Question Set

| Q# | Topic | Tier | Models Populated |
|---|---|---|---|
| Q1 | Success in ~1 year | Required | Goal |
| Q2 | Specific role/outcome | Encouraged | Goal |
| Q3 | Deadline vs flexible | Required | Goal, Risk |
| Q4 | Education/professional background | Required | Skill Graph, Opportunity |
| Q5 | Prior relevant work | Encouraged | Skill Graph, Evidence |
| Q6 | Comfort with core domains | Required | Skill Graph |
| Q7 | Weekday/weekend hours | Required | Constraints |
| Q8 | Seasonal variance | Encouraged | Constraints |
| Q9 | Competing obligations | Encouraged | Constraints, Motivation |
| Q10 | Why this goal, why now | Encouraged | Motivation |
| Q11 | Prior self-directed learning history | Encouraged | Learning Profile, Risk |
| Q12 | Build-first vs study-first | Optional | Learning Profile |
| Q13 | Linear vs exploratory structure | Optional | Learning Profile |
| Q14 | Recovery pattern after breaks | Encouraged (Recovery) | Motivation, Risk |
| Q15 | Discouraging setback types | Optional | Motivation |
| Q16 | Post-interview self-correction | Reflection seed | Motivation, Learning Profile |

Source: `onboarding-intelligence.md` §3–6, §17–18.

#### A.7 Security & Data Handling

| ID | Requirement | Source |
|---|---|---|
| SEC-01 | No secrets in client code | `guiding-principles.md` #29 |
| SEC-02 | Least-privilege access to credentials and career data | `guiding-principles.md` #29 |
| SEC-03 | No logging of raw personal data to third-party analytics | `guiding-principles.md` #28–29 |
| SEC-04 | Prompt injection awareness for LLM-integrated features | `ai-engineering-knowledge-model.md` Security domain |

#### A.8 Non-Functional Requirements

| ID | Requirement | Source |
|---|---|---|
| NF-01 | 8-week MVP target for working onboarding + skill graph + task engine + mentor chat | `vision.md` |
| NF-02 | Maintainability, modularity, clean architecture | `PROJECT.md`, `guiding-principles.md` |
| NF-03 | Historical auditability: reconstruct past recommendations | `career-graph-schema.md` §5 |
| NF-04 | Optimistic concurrency via node `version` fields | `skill-graph-schema.md` §2 |
| NF-05 | Dogfood before demo — feature not done until founder uses it | `guiding-principles.md` #6 |

#### A.9 Open Implementation Decisions (Must Resolve During Build)

| ID | Gap | Source |
|---|---|---|
| OQ-01 | Numeric `minimum_mastery` on dependency edges | `skill-graph-schema.md` §11 |
| OQ-02 | Cross-Goal `importance_weight` aggregation rule | `skill-graph-schema.md` §11 |
| OQ-03 | Scoring formula structure (gated sort vs weighted sum) | `task-generation-engine.md` §12 |
| OQ-04 | Materiality thresholds (decay, constraint change, score ties) | `task-generation-engine.md` §9, §12 |
| OQ-05 | Domain Advantage mapping table (background → skill_keys) | `onboarding-intelligence.md` §11 |
| OQ-06 | Initial Skill Graph node granularity and Core-tier subset for V1 | `ai-engineering-knowledge-model.md` §5.1 |
| OQ-07 | Template Library pre-authoring breadth vs incremental growth | `task-generation-engine.md` §12 |
| OQ-08 | Specialization-tier suppression heuristic in Planning Engine | `ai-engineering-knowledge-model.md` §6.4 |
| OQ-09 | Gamification (XP, Streak, Boss Battle) in V1 vs deferred | `glossary.md` vs `vision.md` V1 scope |
| OQ-10 | Monolith (Next.js API routes) vs separate `services/` from day one | `guiding-principles.md` #7 vs monorepo layout |

---

### B. Data Models

#### B.1 Skill Node

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Immutable |
| `skill_key` | String slug | Ontology reference |
| `user_id` | UUID | Required V1 |
| `name` | String | |
| `description` | Text | |
| `domain` | Enum (9 clusters) | `programming_systems`, `cs_theory`, `data_backend_infra`, `math`, `core_ml_dl`, `llm_genai_systems`, `evaluation_training_production`, `software_systems_engineering`, `meta_skills` |
| `ontology_category` | Enum | `core`, `advanced`, `specialization`, `future` |
| `mastery` | Float 0–1 | Via Evidence only |
| `confidence` | Float 0–1 | Independent of mastery |
| `difficulty` | Enum | `low`, `medium`, `high`, `very_high` |
| `estimated_hours` | `{min, max}` | Ontology prior |
| `transferability` | Enum | |
| `verification_type` | Enum | From ontology |
| `evidence` | Evidence ref[] | |
| `decay_rate` | Float | Per-domain default |
| `misconception_discount` | Float 0–1 | Self-report weight |
| `created_at`, `updated_at` | Timestamp | |
| `version` | Integer | Optimistic concurrency |
| `status` | Enum | `locked`, `available`, `learning`, `practicing`, `verified`, `mastered`, `dormant`, `deprecated` |

Source: `skill-graph-schema.md` §2.

#### B.2 Skill Goal Relevance (Join)

| Field | Type |
|---|---|
| `skill_node_id` | UUID |
| `goal_id` | UUID |
| `importance_weight` | Float 0–1 |

Source: `skill-graph-schema.md` §2.1.

#### B.3 Dependency Edge

| Field | Type |
|---|---|
| `id` | UUID |
| `parent_skill_id` | UUID |
| `child_skill_id` | UUID |
| `minimum_mastery` | Float 0–1 |
| `weight` | Float 0–1 |
| `type` | Enum: `hard`, `soft` |
| `rationale` | Text (optional) |

Source: `skill-graph-schema.md` §3.

#### B.4 Evidence

| Field | Type |
|---|---|
| `id` | UUID |
| `skill_id` | UUID |
| `user_id` | UUID |
| `type` | Enum (see B.5) |
| `content_ref` | Reference |
| `implied_mastery` | Float |
| `recorded_at` | Timestamp |
| `source` | `system` / `user` / `onboarding_interview` |

Source: `skill-graph-schema.md` §6.

#### B.5 Evidence Types & Verification Tiers

**Types:** Completed Project, Quiz, Interview, Reflection, Code Review, GitHub Activity, Course Completion, Boss Battle, Portfolio, Self Report, Self Report Override, External Validation, Mentor Validation.

**Tiers (confidence ceilings):** Tier 1 Self Report (~0.3), Tier 2 Artifact (~0.55), Tier 3 Project (~0.85), Tier 4 Mentor/External (1.0).

Source: `skill-graph-schema.md` §6–7.

#### B.6 User

| Field | Type |
|---|---|
| `user_id` | UUID |
| `display_name` | String |
| `timezone` | IANA string |
| `created_at` | Timestamp |
| `active_status` | Enum |

Source: `career-graph-schema.md` §3.1.

#### B.7 Goal

| Field | Type |
|---|---|
| `goal_id` | UUID |
| `title`, `description` | String/Text |
| `deadline` | Date (nullable) |
| `status` | `active`, `achieved`, `abandoned`, `superseded` |
| `priority_weight` | Float |
| `parent_goal_id` | UUID (nullable) |
| `source` | `onboarding`, `user_initiated_update`, `reflection_derived` |
| `created_at` | Timestamp |

Source: `career-graph-schema.md` §3.2.

#### B.8 Constraints

| Field | Type |
|---|---|
| `weekday_hours` | `{min, max}` |
| `weekend_hours` | `{min, max}` |
| `seasonal_variance` | Structured exceptions[] |
| `hard_deadlines` | Goal ref[] |
| `competing_obligations` | Text/list |
| `last_confirmed_at` | Timestamp |

Source: `career-graph-schema.md` §3.3.

#### B.9 Learning Profile

| Field | Type | Source tag |
|---|---|---|
| `style_preference` | `build_first` / `study_first` / `mixed` | declared |
| `structure_preference` | `linear` / `exploratory` | declared |
| `self_assessment_reliability` | Map cluster → accuracy | inferred |
| `observed_pace_pattern` | Text/null | inferred |
| `behavioral_style_signal` | Structured | inferred |

Source: `career-graph-schema.md` §3.5.

#### B.10 Domain Advantage

| Field | Type |
|---|---|
| `advantage_id` | UUID |
| `source_background` | String |
| `affected_skill_keys` | String[] |
| `confidence` | Float (Tier 1 ceiling) |
| `detected_at` | Timestamp |
| `confirmed_by_evidence` | Boolean |

Source: `career-graph-schema.md` §3.6.

#### B.11 Mission / Quest / Task (Work Hierarchy)

| Field | Scope | Notes |
|---|---|---|
| `id`, `parent_id` | All | Mission→Quest→Task chain |
| `title`, `description` | All | |
| `status` | All | `proposed`, `active`, `completed`, `skipped`, `abandoned` |
| `target_skill_keys` | All | |
| `expected_duration` | Task | Range |
| `source` | All | `planning_engine_generated`, `task_generation_engine_generated`, `user_created` |
| `completed_at` | Task | |
| `evidence_ref` | Task | Links to Evidence on completion |

Source: `career-graph-schema.md` §3.8.

#### B.12 Reflection

| Field | Type |
|---|---|
| `reflection_id` | UUID |
| `trigger` | `milestone`, `user_initiated`, `recovery_check_in` |
| `prompt_shown`, `response_text` | Text |
| `derived_updates` | Structured proposals |
| `user_confirmed_updates` | Per-update boolean |
| `created_at` | Timestamp |

Source: `career-graph-schema.md` §3.10.

#### B.13 Reasoning Trace

| Field | Type |
|---|---|
| `trace_id` | UUID |
| `subject_type` | `task_recommendation`, `roadmap_adjustment`, `mastery_update_proposal` |
| `subject_id` | UUID |
| `inputs_consulted` | Structured refs |
| `narrative` | Text |
| `generated_at` | Timestamp |
| `generated_by` | Engine identifier |

Source: `career-graph-schema.md` §3.11.

#### B.14 Risk State Snapshot

| Field | Type |
|---|---|
| `risk_id` | UUID |
| `pace_risk`, `scope_risk`, `burnout_risk` | `{level, confidence}` each |
| `contributing_factors` | Structured refs |
| `computed_at` | Timestamp |

Source: `career-graph-schema.md` §3.12.

#### B.15 Opportunity State Snapshot

| Field | Type |
|---|---|
| `opportunity_id` | UUID |
| `type` | V1: `constraint_change_unlock` only |
| `description` | Text |
| `affected_skill_or_goal_refs` | Refs |
| `confidence` | Float |
| `surfaced_to_user` | Boolean |
| `detected_at` | Timestamp |

Source: `career-graph-schema.md` §3.13.

#### B.16 History Event

| Field | Type |
|---|---|
| `event_id` | UUID |
| `event_type` | Enum |
| `payload` | Reference to affected record |
| `occurred_at` | Timestamp |
| `actor` | `user` or engine name |

Source: `career-graph-schema.md` §3.14.

#### B.17 Career Graph Metadata

| Field | Type |
|---|---|
| `schema_version` | Semver string |
| `career_graph_version` | Integer (monotonic) |
| `last_full_snapshot_at` | Timestamp (optional) |

Source: `career-graph-schema.md` §3.15.

#### B.18 Computed (Not Persisted)

| Model | Description |
|---|---|
| **Roadmap** | Ordered Mission/Quest projection from Skill Graph + Goals + Constraints |
| **Decision Context** | Request-scoped bundle for one reasoning pass |
| **Learning Velocity** | Derived from History |
| **Momentum** | Trailing 2–3 week engagement trend |
| **Progress Score** | Per-Goal aggregate from Mastery × importance_weight |

Sources: `career-graph-schema.md` §3.9, `career-intelligence-engine.md` §3.7–3.9, `glossary.md`.

#### B.19 Task Generation Output (Transient + Persisted)

Persisted as Task record + Reasoning Trace. See `task-generation-engine.md` §3.

#### B.20 Ontology Content Model (Seed, Not Per-User)

Per-domain template fields: Purpose, Importance, Difficulty, Estimated Mastery Time, Industry Relevance, Transferability, Dependencies, Unlocks, Suggested Projects, How Mastery Can Be Verified, Common Misconceptions.

Source: `ai-engineering-knowledge-model.md` §1.

---

### C. Entities

| Entity | Persisted | Mutable | Append-Only |
|---|---|---|---|
| User | Yes | Rarely | No |
| Goal | Yes | Status transitions | Prefer supersede over delete |
| Constraints | Yes | Yes (logged) | No |
| Skill Node | Yes | Via Evidence paths | History log append |
| Dependency Edge | Yes | Ontology-driven | No |
| Skill Goal Relevance | Yes | Yes | No |
| Evidence | Yes | No | Yes |
| Skill Node History | Yes | No | Yes |
| Learning Profile | Yes | Declared + inferred | No |
| Domain Advantage | Yes | `confirmed_by_evidence` only | No |
| Mission | Yes | Status only | No |
| Quest | Yes | Status only | No |
| Task | Yes | Status only | No |
| Reflection | Yes | Pre-confirmation window only | No |
| Reasoning Trace | Yes | No | Yes |
| Risk State Snapshot | Yes | New snapshot each compute | Yes |
| Opportunity State Snapshot | Yes | New snapshot each detect | Yes |
| History Event | Yes | No | Yes |
| Career Graph Metadata | Yes | System-managed | No |
| Roadmap | No | N/A | N/A |
| Decision Context | No (cache optional) | N/A | N/A |
| Task Template | Yes (content) | Versioned | No |
| Ontology Domain | Yes (seed content) | Versioned independently | No |
| Chat Message | Yes (implied) | No | Yes |
| Domain Advantage Mapping | Yes (config) | Versioned | No |

---

### D. Relationships

```
User 1──* Goal
User 1──1 Constraints
User 1──* Skill Node
User 1──1 Learning Profile
User 1──* Domain Advantage
User 1──* Mission
User 1──* Evidence
User 1──* Reflection
User 1──* Reasoning Trace
User 1──* History Event
User 1──* Risk State Snapshot
User 1──* Opportunity State Snapshot

Goal *──* Skill Node          via skill_goal_relevance (importance_weight)
Goal 0──* Goal                via parent_goal_id (Goal Graph)

Skill Node *──* Skill Node    via Dependency Edge (parent→child, hard/soft)
Skill Node 1──* Evidence
Skill Node *──* Task          via target_skill_keys

Mission 1──* Quest            via parent_id
Quest 1──* Task               via parent_id
Task 0──1 Evidence            on completion (evidence_ref)

Task 1──1 Reasoning Trace     (subject_type=task_recommendation)
Mission/Quest 0──1 Reasoning Trace (roadmap_adjustment)

Reflection *──? Skill Node    derived_updates may propose Mastery changes
Reflection *──? Goal          derived_updates may propose Goal changes
Evidence ──► Skill Node       triggers Mastery/Confidence update (weighted)

Domain Advantage *──* Skill Node   affected_skill_keys (provenance, not duplicate mastery)

History Event ──► *           references any component (payload ref)

Ontology Domain ──► Skill Node     seed via skill_key at onboarding
Ontology Domain ──► Task Template  Suggested Projects source
Task Template ──► Skill Node       parameterized by skill_key + mastery band

Planning Engine reads: Goals + Skill Graph + Constraints
Planning Engine writes: Mission/Quest (materialization only)
Task Generation Engine reads: near-term Roadmap slice + full §2 inputs
Task Generation Engine writes: Task + Reasoning Trace
Reflection Engine reads: Reflection, Evidence, History
Reflection Engine writes: proposed Evidence / profile updates (confirmed path)
Recovery Engine reads: History, Momentum, Risk
Recovery Engine triggers: Planning Engine recompute
Mentor Engine reads: Decision Context, Reasoning Traces, chat history
Mentor Engine calls: Decision Engine when recommendation change implied
Risk Engine reads: History, Skill Graph, Constraints, Goals
Risk Engine writes: Risk State Snapshot
Opportunity Engine (stub) reads: Constraints, Skill Graph
Opportunity Engine writes: Opportunity State Snapshot
```

Hard dependency rule: child Skill `locked` until all **hard** parent edges meet `minimum_mastery`. Soft edges influence ranking only.

Source: `skill-graph-schema.md` §3.1, `career-graph-schema.md` §3.

---

### E. Architectural Decisions

| ID | Decision | Rationale | Source |
|---|---|---|---|
| AD-01 | Monorepo with `apps/`, `services/`, `packages/` | Scalable separation; V1 may start as monolith inside `apps/web` | Repo structure, `guiding-principles.md` #7 |
| AD-02 | Postgres (Supabase) as primary store | Sufficient for V1 graph traversal via recursive CTEs; no graph DB | `skill-graph-schema.md` §10.1, §12 |
| AD-03 | Normalized tables, Career Graph as assembled view | Auditability, RLS, no single JSON blob as source of truth | `career-graph-schema.md` §7.1 |
| AD-04 | Next.js for web frontend | Stated in vision; full-stack AI product engineering alignment | `vision.md`, `ai-engineering-knowledge-model.md` |
| AD-05 | Supabase Auth + RLS | Minimal auth for V1 single user; multi-tenant-ready schema | `vision.md`, `guiding-principles.md` #10 |
| AD-06 | Claude API as reasoning layer | Product philosophy: AI is core, not decorative | `product-philosophy.md` §1 |
| AD-07 | Engines as prompt/reasoning modes in V1, not separate deployables | Guiding Principle 7 — avoid premature service split | `career-intelligence-engine.md` §4 |
| AD-08 | Routing engine mental model | Map = Career Graph; Route = computed Roadmap | `career-intelligence-engine.md` §1 |
| AD-09 | Template Library + hybrid LLM for Tasks | Determinism + explainability over generative freedom | `task-generation-engine.md` §5.3, §10 |
| AD-10 | Confidence decay on `confidence` only, not `mastery` | Historical capability preserved; staleness visible | `skill-graph-schema.md` §5.3 |
| AD-11 | Evidence tier ceilings are non-additive | Prevents self-report stacking to project-tier confidence | `skill-graph-schema.md` §7 |
| AD-12 | `career_graph_version` trigger on any child write | Cheap cache invalidation for Decision Context | `career-graph-schema.md` §7.1 |
| AD-13 | Insert-only DB grants on immutable tables | Strongest immutability guarantee | `career-graph-schema.md` §7.1 |
| AD-14 | Ontology content versioned separately from schema | LLM domain evolves faster than structural schema | `ai-engineering-knowledge-model.md` §6.5 |
| AD-15 | Risk/Opportunity as append-only snapshot sequences | Trend analysis + audit | `career-graph-schema.md` §3.12–3.13 |
| AD-16 | Recommendation stability: identical input → identical output | Prevents erratic daily recommendations | `task-generation-engine.md` §9 |
| AD-17 | Roadmap stability vs Task responsiveness split | Material changes replan Missions; routine variance adjusts Tasks only | `career-intelligence-engine.md` §6 |
| AD-18 | Mentor Engine never reasons independently of structured models | Re-derivability requirement | `guiding-principles.md` #25 |
| AD-19 | Reflection confirmation gate before Mastery commit | Human in the loop on self-model | `career-intelligence-engine.md` §4.4 |
| AD-20 | Deferred: separate Knowledge Graph | V1 uses hand-curated Skill seed set | `career-intelligence-engine.md` §3.4 |

---

## Phased Implementation Plan

**Assumptions:**

- Solo founder-engineer, ~15–20 hrs/week engineering time alongside employment
- Effort estimates in **person-days** (1 day ≈ 4–6 focused hours)
- **Recommended V1 shape (resolves OQ-10):** Monolith — Next.js App Router in `apps/web` with API Route Handlers / Server Actions; Supabase for DB + Auth; shared types in `packages/`; Claude called from server only
- **Recommended V1 graph scope (resolves OQ-06 partially):** Core-tier ontology domains decomposed to ~40–60 Skill nodes for initial seed; expand reactively per OQ-07

**Critical path:** Phase 1 → 2 → 3 → 5 → 6 → 4 (minimal UI for dogfooding) → 4 (full UI) → 7

---

## Phase 1 — Repository Setup

**Goal:** Runnable monorepo skeleton, tooling, environment contracts, no product logic.

### Order of Implementation

1. Root workspace configuration (package manager, TypeScript base)
2. `packages/shared` — types, enums, constants mirroring docs
3. `packages/config` — ESLint, TypeScript extends
4. `apps/web` — Next.js App Router scaffold
5. Environment variable contract + validation
6. Supabase project linkage (local + remote)
7. CI skeleton (lint, typecheck)
8. ADR for stack choices (closes OQ-10 formally)

### Files & Folders to Create

```
CareerOS/
├── package.json                          # workspace root
├── pnpm-workspace.yaml                   # or npm/yarn workspaces
├── turbo.json                            # optional task orchestration
├── tsconfig.base.json
├── .env.example
├── .nvmrc                                # optional Node version pin
├── apps/
│   └── web/
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.ts
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx
│       │   │   └── api/                  # health check only initially
│       │   │       └── health/route.ts
│       │   └── lib/
│       │       └── env.ts                # Zod-validated env
│       └── .env.local.example
├── packages/
│   ├── shared/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── enums/                    # SkillStatus, EvidenceType, etc.
│   │       └── types/                    # mirrors B.1–B.17 models
│   └── config/
│       ├── eslint/
│       └── typescript/
├── supabase/
│   ├── config.toml
│   └── seed/                             # placeholder
├── docs/
│   └── decisions/
│       └── 0001-v1-monolith-nextjs-supabase-claude.md
└── .github/
    └── workflows/
        └── ci.yml
```

### Dependencies

| Package | Where | Purpose |
|---|---|---|
| `next`, `react`, `react-dom` | `apps/web` | Web app |
| `typescript` | root | Types |
| `@supabase/supabase-js` | `apps/web`, `packages/shared` | DB client |
| `zod` | `apps/web`, `packages/shared` | Env + validation |
| `eslint`, `prettier` | root | Lint/format |
| `turbo` | root (optional) | Monorepo tasks |

### Estimated Effort

**3–5 person-days**

### Blockers

| Blocker | Resolution |
|---|---|
| Supabase project not created | Create project; obtain URL + anon + service keys |
| OQ-10 unresolved | Default monolith per AD-01/AD-07; document in ADR 0001 |
| Node/pnpm version | Pin in `.nvmrc` + `package.json` engines |

### Exit Criteria

- `pnpm install && pnpm dev` serves health check
- `pnpm lint && pnpm typecheck` pass in CI
- Env validation fails loudly on missing `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`

---

## Phase 2 — Database

**Goal:** Postgres schema, RLS, seed ontology, migrations, Career Graph persistence layer.

### Order of Implementation

1. Resolve OQ-05: Domain Advantage mapping seed file
2. Resolve OQ-06: V1 Core skill node seed list (decompose from ontology)
3. Migration 001: `users`, `career_graph_metadata`
4. Migration 002: `goals`, `constraints`, `learning_profiles`, `domain_advantages`
5. Migration 003: `skill_nodes`, `skill_dependencies`, `skill_goal_relevance`
6. Migration 004: `skill_evidence`, `skill_node_history` (insert-only)
7. Migration 005: `missions`, `quests`, `tasks`
8. Migration 006: `reflections`, `reasoning_traces`, `history_events` (insert-only)
9. Migration 007: `risk_state_snapshots`, `opportunity_state_snapshots`
10. Migration 008: `task_templates`, `ontology_versions`
11. RLS policies on all user-scoped tables
12. `career_graph_version` increment trigger
13. Seed scripts: ontology → skill_nodes template, dependency edges, task templates
14. `packages/db` — typed query helpers + Career Graph assembler

### Files & Folders to Create

```
supabase/
├── migrations/
│   ├── 20260714000001_users_and_metadata.sql
│   ├── 20260714000002_goals_constraints_profiles.sql
│   ├── 20260714000003_skill_graph.sql
│   ├── 20260714000004_evidence_and_history.sql
│   ├── 20260714000005_work_hierarchy.sql
│   ├── 20260714000006_reflections_traces_events.sql
│   ├── 20260714000007_risk_opportunity_snapshots.sql
│   └── 20260714000008_templates_and_ontology.sql
├── seed/
│   ├── skill_nodes.core.v1.json          # OQ-06 resolved content
│   ├── skill_dependencies.core.v1.json
│   ├── domain_advantage_mapping.v1.json  # OQ-05
│   └── task_templates.core.v1.json       # from Suggested Projects
└── tests/
    └── rls_policies.test.sql             # optional pgTAP

packages/
└── db/
    ├── package.json
    └── src/
        ├── client.ts                     # Supabase server client factory
        ├── assembler/
        │   └── career-graph.ts           # normalized → CareerGraph shape
        ├── repositories/
        │   ├── users.ts
        │   ├── goals.ts
        │   ├── constraints.ts
        │   ├── skill-nodes.ts
        │   ├── evidence.ts
        │   ├── tasks.ts
        │   ├── reasoning-traces.ts
        │   └── history.ts
        └── migrations/README.md

docs/
└── database/
    ├── schema-overview.md                # ER diagram + table index
    └── migration-strategy.md
```

### Dependencies

| Dependency | Notes |
|---|---|
| Phase 1 complete | Workspace + Supabase linked |
| `@supabase/supabase-js` | Client |
| `packages/shared` enums/types | Single source for enums |
| Supabase CLI | Local migration apply |

### Estimated Effort

**8–12 person-days**

### Blockers

| Blocker | Resolution |
|---|---|
| OQ-01 minimum_mastery values | Seed with conservative defaults (0.3 hard deps); calibrate in Phase 5 |
| OQ-06 node granularity | Ship Core ~40–60 nodes; document split plan |
| OQ-05 Domain Advantage map | Author `domain_advantage_mapping.v1.json` from onboarding §11 |
| Cross-goal aggregation OQ-02 | Default: max(importance_weight) across active goals for V1 |
| Insert-only enforcement | Supabase RLS + revoke UPDATE on immutable tables |

### Exit Criteria

- Migrations apply cleanly locally and on remote Supabase
- Seed produces full Core Skill Graph for one user
- Career Graph assembler returns valid JSON matching `career-graph-schema.md` §6 shape
- RLS prevents cross-user reads (test with two auth users even if V1 has one)

---

## Phase 3 — Backend

**Goal:** Server-side API layer, domain services, Career Graph CRUD, event logging, export — no AI yet.

### Order of Implementation

1. Auth middleware (Supabase session on server)
2. Career Graph read API (assembled view)
3. Goal / Constraint CRUD + History events
4. Evidence submission → Mastery update pipeline (weighted formula §5.6)
5. Task status transitions (complete / skip / override) + Evidence creation
6. Reflection create + confirm flow (proposed updates)
7. Reasoning Trace write (structure only; narrative placeholder OK initially)
8. Risk snapshot write (manual trigger stub)
9. History event emitter (central utility)
10. Data export endpoint (JSON/markdown per PR-19)
11. Onboarding state machine API (phase tracking, answer persistence)

### Files & Folders to Create

```
apps/web/src/
├── app/api/
│   ├── career-graph/route.ts             # GET assembled graph
│   ├── goals/route.ts
│   ├── goals/[id]/route.ts
│   ├── constraints/route.ts
│   ├── skills/route.ts                   # list nodes + filters
│   ├── skills/[id]/route.ts
│   ├── evidence/route.ts                 # POST append-only
│   ├── tasks/route.ts
│   ├── tasks/[id]/
│   │   ├── route.ts
│   │   ├── complete/route.ts
│   │   └── skip/route.ts
│   ├── reflections/route.ts
│   ├── reflections/[id]/confirm/route.ts
│   ├── onboarding/
│   │   ├── session/route.ts
│   │   ├── answers/route.ts
│   │   └── complete/route.ts
│   ├── export/route.ts
│   └── health/route.ts
├── server/
│   ├── auth/
│   │   └── get-session.ts
│   ├── services/
│   │   ├── career-graph-service.ts
│   │   ├── evidence-service.ts           # mastery weighted update
│   │   ├── skill-state-service.ts        # status machine §4
│   │   ├── task-service.ts
│   │   ├── reflection-service.ts
│   │   ├── history-service.ts
│   │   └── export-service.ts
│   └── errors/
│       └── api-error.ts                  # fail loud SEC/AR-13

packages/shared/src/
├── schemas/                              # Zod request/response schemas
│   ├── career-graph.ts
│   ├── evidence.ts
│   ├── task.ts
│   └── onboarding.ts

docs/api/
├── overview.md
├── career-graph.md
├── tasks.md
├── evidence.md
├── onboarding.md
└── errors.md
```

### Dependencies

| Dependency | Notes |
|---|---|
| Phase 2 complete | All tables + repositories |
| `zod` | Request validation |
| Phase 5 partial | Onboarding complete triggers graph generation (can stub initially) |

### Estimated Effort

**10–14 person-days**

### Blockers

| Blocker | Resolution |
|---|---|
| Mastery weighted-update formula | Implement per `skill-graph-schema.md` §5.6 exactly |
| Skill status machine complexity | Unit test all transitions §4 |
| Onboarding API without AI | Phase 3 can persist answers; Phase 5 generates graph |
| API docs lag | Write `docs/api/*` in parallel with routes |

### Exit Criteria

- Authenticated CRUD for Goals, Constraints, Skills, Evidence, Tasks
- Task completion creates Evidence and updates Mastery + status
- Every mutation writes History event
- Export returns full Career Graph + History
- Override/skip logged with reason payload

---

## Phase 4 — Frontend

**Goal:** Web UI for V1 core surfaces — onboarding, today view, skill tree, mentor chat shell, reflection.

### Order of Implementation

**Slice A — Dogfood minimum (week 5–6 target)**

1. Auth UI (Supabase magic link or email/password)
2. Onboarding chat UI (Phase 1 questions Q1/Q3/Q4/Q6/Q7)
3. "Today" page — recommended Task + reasoning + alternatives
4. Task complete / skip / override flows
5. Basic Skill Tree visualization (read-only)

**Slice B — Full V1 UI**

6. Onboarding Phase 2/3 question flows
7. Roadmap view (computed, read-only Mission/Quest list)
8. Reflection modal/page
9. Risk banner component
10. Recovery re-engagement UI
11. Mentor Chat interface
12. Settings: Constraints edit, timezone, export trigger
13. Confidence/Mastery dual indicators on Skill Tree (AR transparency)

### Files & Folders to Create

```
apps/web/src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── callback/route.ts
│   ├── (app)/
│   │   ├── layout.tsx                    # app shell + nav
│   │   ├── today/page.tsx                # PR-12 primary surface
│   │   ├── skills/page.tsx               # Skill Tree
│   │   ├── roadmap/page.tsx
│   │   ├── mentor/page.tsx
│   │   ├── reflect/page.tsx
│   │   ├── onboarding/page.tsx
│   │   └── settings/page.tsx
│   └── globals.css
├── components/
│   ├── onboarding/
│   │   ├── interview-chat.tsx
│   │   ├── question-card.tsx
│   │   └── phase-progress.tsx
│   ├── tasks/
│   │   ├── recommended-task.tsx
│   │   ├── alternative-tasks.tsx
│   │   ├── reasoning-trace-panel.tsx
│   │   └── task-actions.tsx
│   ├── skills/
│   │   ├── skill-tree-graph.tsx          # graph viz library TBD
│   │   └── skill-node-detail.tsx
│   ├── roadmap/
│   │   └── mission-quest-list.tsx
│   ├── mentor/
│   │   ├── chat-thread.tsx
│   │   └── message-bubble.tsx
│   ├── risk/
│   │   └── risk-banner.tsx
│   └── ui/                               # shadcn or minimal primitives
├── hooks/
│   ├── use-career-graph.ts
│   ├── use-today-recommendation.ts
│   └── use-onboarding-session.ts
└── lib/
    └── api-client.ts

docs/ui/
├── information-architecture.md
├── screen-specs/
│   ├── today.md                          # "What should I do today?"
│   ├── onboarding.md
│   ├── skill-tree.md
│   ├── mentor-chat.md
│   └── settings.md
└── design-tokens.md                      # minimal V1
```

### Dependencies

| Package | Purpose |
|---|---|
| `@tanstack/react-query` | Server state |
| Graph viz (`reactflow` or `@xyflow/react` or `vis-network`) | Skill Tree |
| UI primitives (`@radix-ui/*` + tailwind or shadcn) | Components |
| Phase 3 APIs | All data |
| Phase 5/6 | Recommendations + mentor responses |

### Estimated Effort

| Slice | Effort |
|---|---|
| Slice A (dogfood minimum) | **8–10 person-days** |
| Slice B (full V1 UI) | **10–14 person-days** |
| **Total** | **18–24 person-days** |

### Blockers

| Blocker | Resolution |
|---|---|
| No UI specs yet | Author `docs/ui/screen-specs/*` before each screen (Principle #15) |
| Skill Tree perf with 60+ nodes | Virtualize; filter deprecated/locked |
| OQ-09 gamification | Defer XP/Streak UI unless explicitly scoped; Recovery UI still needed |
| Phase 5/6 not ready | Mock recommendations for Slice A with static template |

### Exit Criteria

- Founder completes onboarding in UI
- Today page shows live recommendation from Task Generation Engine
- Task completion updates Skill Tree without page contradictions
- Mentor Chat sends messages and displays grounded responses
- Every screen maps to one named user question (Principle #15)

---

## Phase 5 — Decision Engine

**Goal:** Planning Engine, Task Generation Engine, Risk Engine (simplified), Recovery Engine, Reflection Engine — deterministic core.

### Order of Implementation

1. Decision Context assembler (cache keyed on `career_graph_version`)
2. Skill gap identification + dependency evaluation
3. Planning Engine: near-term Mission/Quest computation (in-memory)
4. Mission/Quest materialization logic (when to persist)
5. Template Library loader + mastery-band variant selection
6. Candidate generation (deterministic, no LLM)
7. Filter Impossible Tasks
8. Scoring model (implement gated primary/secondary structure per §6.2)
9. Risk Engine: Learning Velocity + pace/scope/burnout rules
10. Risk Adjustment + Opportunity stub
11. Task Generation pipeline orchestrator
12. Reasoning Trace structural builder (inputs_consulted)
13. Recovery Engine: gap detection + replan trigger
14. Reflection Engine: proposed Mastery updates from Reflection text (rule-based V1)
15. Onboarding Intelligence: graph generation 7-step sequence
16. Domain Advantage synthesis
17. Goal validation + timeline realism checks
18. Recommendation stability guard (input hash comparison)

### Files & Folders to Create

```
packages/
└── decision-engine/
    ├── package.json
    └── src/
        ├── index.ts
        ├── context/
        │   └── decision-context-assembler.ts
        ├── planning/
        │   ├── planning-engine.ts
        │   ├── roadmap-computer.ts         # returns in-memory Roadmap
        │   ├── mission-materializer.ts
        │   └── specialization-suppression.ts  # OQ-08
        ├── task-generation/
        │   ├── pipeline.ts
        │   ├── stages/
        │   │   ├── observe.ts
        │   │   ├── update-user-state.ts
        │   │   ├── identify-gaps.ts
        │   │   ├── evaluate-dependencies.ts
        │   │   ├── generate-candidates.ts
        │   │   ├── filter-impossible.ts
        │   │   ├── score-candidates.ts
        │   │   ├── risk-adjustment.ts
        │   │   ├── opportunity-adjustment.ts
        │   │   ├── select.ts
        │   │   └── build-trace-structure.ts
        │   ├── scoring/
        │   │   ├── factors.ts
        │   │   └── scorer.ts               # OQ-03 resolved here
        │   └── templates/
        │       └── template-library.ts
        ├── risk/
        │   └── risk-engine.ts
        ├── recovery/
        │   └── recovery-engine.ts
        ├── reflection/
        │   └── reflection-engine.ts
        ├── onboarding/
        │   ├── onboarding-intelligence.ts
        │   ├── goal-validator.ts
        │   ├── domain-advantage.ts
        │   ├── confidence-scorer.ts
        │   ├── inconsistency-detector.ts
        │   └── career-graph-generator.ts   # §19 7-step sequence
        └── utils/
            ├── learning-velocity.ts
            ├── momentum.ts
            ├── confidence-decay.ts
            └── stability-guard.ts

apps/web/src/app/api/
├── recommendations/
│   └── today/route.ts                    # invokes pipeline
├── planning/
│   └── roadmap/route.ts                  # computed view
├── onboarding/
│   └── complete/route.ts                 # wires onboarding-intelligence
└── recovery/
    └── trigger/route.ts

docs/ai/
├── decision-engine-overview.md
└── task-generation-pipeline.md
```

### Dependencies

| Dependency | Notes |
|---|---|
| Phase 2 | Full data model |
| Phase 3 | Services to persist outputs |
| `packages/shared` | Types |
| Task template seed | Phase 2 seed |
| OQ-03, OQ-04, OQ-08 resolved | Document defaults in `docs/ai/` |

### Estimated Effort

**15–20 person-days**

### Blockers

| Blocker | Resolution |
|---|---|
| OQ-03 scoring formula | Implement gated sort; log scores for calibration |
| OQ-04 materiality thresholds | Start conservative (7-day decay material; 14-day gap = recovery) |
| OQ-07 template coverage | Log template misses per §11; expand weekly |
| OQ-08 specialization suppression | Hard-exclude specialization nodes until Core mastery avg > 0.5 |
| Planning vs materialization confusion | Follow `career-graph-schema.md` §3.8–3.9 strictly |
| Cross-goal aggregation OQ-02 | V1: max weight across active goals |

### Exit Criteria

- Onboarding Required questions → Career Graph + Day 1 Task in one flow
- Repeated `/recommendations/today` with same state returns identical Task
- Task completion → Evidence → Mastery update → different next recommendation
- Recovery triggers after configurable absence window
- Every recommendation has immutable Reasoning Trace with `inputs_consulted`
- Risk snapshot persisted on weekly cadence or on-demand

---

## Phase 6 — Claude Integration

**Goal:** Bounded Claude API usage for onboarding conversation, template personalization, trace prose, mentor chat — server-side only.

### Order of Implementation

1. Claude client wrapper ( retries, idempotency keys, structured logging)
2. Prompt registry loader from `prompts/`
3. Onboarding conversational layer (Mentor Engine mode for Q1–Q16)
4. Follow-up question generation (§8 bounded rules)
5. Goal structuring from free-text (Q1/Q2 → Goal Model)
6. Template personalization pass (§5.3 hybrid)
7. Reasoning Trace narrative rendering (structure → prose)
8. Mentor Engine: grounded Q&A over Decision Context + traces
9. Mentor Engine: re-plan requests → Decision Engine invocation
10. Reflection interpretation (upgrade from rule-based if needed)
11. Fail-loud error surfacing to UI
12. Prompt versioning metadata + change log

### Files & Folders to Create

```
packages/
└── ai/
    ├── package.json
    └── src/
        ├── client/
        │   ├── anthropic-client.ts
        │   ├── idempotency.ts            # AR-14
        │   └── error-mapping.ts          # AR-13 fail loud
        ├── prompts/
        │   ├── loader.ts
        │   └── version.ts
        ├── engines/
        │   ├── mentor-engine.ts
        │   ├── onboarding-conversation.ts
        │   ├── template-personalizer.ts
        │   └── trace-narrator.ts
        └── context/
            └── context-builder.ts        # serializes Decision Context for prompts

prompts/
├── onboarding/
│   ├── system.md
│   ├── goal-extraction.md
│   ├── follow-up-vague-goal.md
│   └── inconsistency-surfacing.md
├── task-generation/
│   ├── personalize-template.md
│   └── trace-narrator.md
├── mentor/
│   ├── system.md
│   ├── explain-recommendation.md
│   └── replan-request.md
└── CHANGELOG.md

apps/web/src/app/api/
├── mentor/
│   ├── chat/route.ts                     # streaming optional
│   └── explain/[taskId]/route.ts
└── onboarding/
    └── chat/route.ts

docs/ai/
├── claude-integration.md
├── prompt-versioning.md
├── context-assembly.md
└── safety-guardrails.md
```

### Dependencies

| Package | Purpose |
|---|---|
| `@anthropic-ai/sdk` | Claude API |
| Phase 5 | Decision Engine outputs + context |
| Phase 3 | Persistence for chat history (add `chat_messages` migration) |

**Additional migration (Phase 6):**

```
supabase/migrations/20260714000009_chat_messages.sql
```

| Table | Purpose |
|---|---|
| `chat_messages` | Mentor + onboarding conversation log (append-only) |

### Estimated Effort

**8–12 person-days**

### Blockers

| Blocker | Resolution |
|---|---|
| API cost / rate limits | Cache trace narratives; narrow prompt sizes |
| Ungrounded mentor responses | Enforce tool pattern: fetch Career Graph + traces before every reply |
| AR-14 idempotency on graph mutations | Idempotency key = hash(prompt + input state + operation) |
| Prompt injection | System prompt boundaries + no secret leakage in context |
| Streaming vs non-streaming | V1 non-streaming acceptable; add streaming later |

### Exit Criteria

- Onboarding feels conversational (not a form) for Required questions
- Personalized Task titles reference user context from Evidence/Goals
- Mentor can answer "why this task?" from stored trace without new full pipeline run
- Mentor re-plan request triggers Planning Engine + new recommendation
- API failures show explicit UI error, not stale recommendation
- All prompts versioned in `prompts/` with CHANGELOG entries

---

## Phase 7 — Testing

**Goal:** Confidence to dogfood daily — unit, integration, and critical E2E paths.

### Order of Implementation

1. Test infrastructure (Vitest + Playwright)
2. Unit: Mastery weighted-update, status transitions, confidence ceilings
3. Unit: Scoring factors + gated sort determinism
4. Unit: Confidence decay + stability guard
5. Unit: Goal validation + timeline realism
6. Integration: Evidence → Mastery → gap → recommendation chain
7. Integration: Onboarding Required path → Career Graph shape
8. Integration: RLS policy verification
9. E2E: Login → onboarding Phase 1 → today task → complete → skill update
10. E2E: Skip task → override logged → different recommendation
11. E2E: Mentor explain recommendation
12. E2E: Export data
13. Snapshot tests: Reasoning Trace structure (not LLM prose)
14. CI: all tests on PR

### Files & Folders to Create

```
packages/decision-engine/
└── src/**/*.test.ts

packages/db/
└── src/**/*.test.ts

apps/web/
├── vitest.config.ts
├── playwright.config.ts
└── e2e/
    ├── onboarding-phase1.spec.ts
    ├── today-recommendation.spec.ts
    ├── task-completion.spec.ts
    ├── mentor-explain.spec.ts
    └── export.spec.ts

.github/workflows/
├── ci.yml                                # extend with test job
└── e2e.yml                               # optional nightly

docs/implementation/
└── test-plan.md
```

### Dependencies

| Dependency | Notes |
|---|---|
| Phases 1–6 feature-complete | E2E requires full stack |
| Supabase local or test project | Integration tests |
| `vitest`, `@playwright/test` | Test runners |
| `msw` or similar | Mock Claude in unit tests |

### Estimated Effort

**8–12 person-days** (ongoing; initial suite)

### Blockers

| Blocker | Resolution |
|---|---|
| LLM non-determinism | Mock Claude in all automated tests; manual dogfood checklist for AI quality |
| E2E flakiness | Fixed test user seed; reset DB between runs |
| No test plan doc | Create `test-plan.md` with Principle #16 measurable definitions |

### Exit Criteria

- CI green on lint, typecheck, unit, integration
- E2E covers core loop: onboard → recommend → act → update → re-recommend
- Mastery/evidence invariants enforced by tests (no direct mastery writes)
- Reasoning trace immutability verified
- Founder sign-off on daily dogfood (Principle #6, #20)

---

## Master Timeline Estimate

| Phase | Effort (person-days) | Cumulative | Calendar (~15 hrs/wk) |
|---|---|---|---|
| 1 Repository | 3–5 | 5 | Week 1 |
| 2 Database | 8–12 | 17 | Weeks 2–3 |
| 3 Backend | 10–14 | 31 | Weeks 3–5 |
| 5 Decision Engine | 15–20 | 51 | Weeks 5–8 |
| 6 Claude Integration | 8–12 | 63 | Weeks 7–9 |
| 4 Frontend A (dogfood) | 8–10 | 73 | Weeks 6–8 (parallel) |
| 4 Frontend B (full) | 10–14 | 87 | Weeks 9–11 |
| 7 Testing | 8–12 | 99 | Weeks 10–12 (parallel) |

**Parallelization note:** Phase 4 Slice A can start after Phase 3 partial (week 5). Phase 6 can overlap Phase 5 final stages. Phase 7 runs continuously after Phase 3 but E2E requires Phase 6.

**Aligned to 8-week MVP (`vision.md`):** Achievable for **Slice A** (onboarding Phase 1 + today recommendation + basic skill tree) if Phase 5 core pipeline completes by week 7–8. Full V1 UI + mentor + recovery + test suite extends to **~10–12 weeks**.

---

## Cross-Phase Dependency Graph

```
Phase 1 ──► Phase 2 ──► Phase 3 ──┬──► Phase 4A ──► Phase 4B
                     │              │
                     └──────────────┼──► Phase 5 ──► Phase 6
                                    │         │
                                    └─────────┴──► Phase 7
```

---

## Pre-Implementation Checklist (Resolve Before Phase 2 Seed)

- [ ] **OQ-05:** Publish `domain_advantage_mapping.v1.json`
- [ ] **OQ-06:** Publish `skill_nodes.core.v1.json` (decomposed Core nodes)
- [ ] **OQ-07:** Author minimum task template set (~20 templates covering top Core skills)
- [ ] **OQ-09:** Confirm gamification deferral (XP/Streak/Boss Battle post-MVP)
- [ ] **OQ-10:** Accept ADR 0001 monolith shape
- [ ] **OQ-03/04:** Document V1 default thresholds in `docs/ai/task-generation-pipeline.md`
- [ ] **OQ-08:** Document specialization suppression rule in Planning Engine
- [ ] Create `docs/database/schema-overview.md` when migrations stabilize
- [ ] Promote Confidence-composition to `guiding-principles.md` (per architecture doc §9 suggestion)

---

## Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| Template Library too sparse early | Weak recommendations | Log gaps; weekly template authoring; fallback diagnostic Tasks |
| 8-week MVP scope creep | Miss daily-use deadline | Strict Slice A scope; defer Recovery polish, Roadmap UI, gamification |
| Skill Graph too large for UI | Poor Skill Tree UX | Core subset first; cluster collapse in viz |
| Claude costs during onboarding | Budget | Minimize tokens; structure extraction calls |
| Over-engineering services split | Slower MVP | Monolith until Phase 5 proves loop |
| Documentation drift from code | Wrong behavior | `packages/shared` types are generated from docs enums; PR requires doc update for schema changes |
| Solo builder burnout | Project stall | Recovery Engine models real constraints; plan conservatively on Q7 hours |

---

## Definition of Done — V1 Release

Per `vision.md`, `founder-intent.md`, and `guiding-principles.md`:

1. Founder completes Onboarding (at minimum Phase 1 Required questions) via conversational UI
2. Career Graph persisted with seeded Skill Graph, Goals, Constraints, Domain Advantages
3. Daily Task recommendation with Reasoning Trace and alternatives
4. Task completion updates Skill Graph through Evidence (single source of truth)
5. Skill Tree visualization reflects Mastery and Confidence distinctly
6. Mentor Chat grounded in Career Graph; can explain stored traces
7. Recovery flow after absence (no shame mechanics)
8. User-initiated Reflection with confirmation gate on Mastery updates
9. Risk assessment visible when elevated
10. Full data export works
11. Founder has used the system to make real career decisions for 7+ consecutive days (dogfood criterion)

---

*This roadmap is a living document. Update it when ADRs, schema migrations, or open questions (§A.9) are resolved.*
