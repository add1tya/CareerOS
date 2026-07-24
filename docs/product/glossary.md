# Glossary

Status: Shared vocabulary. Every engineer, human or AI agent, must use these terms with these exact meanings. If a new concept needs a name, it is added here before it is used in code, UI copy, or documentation.

---

### Career Graph
The complete structured model of the user's professional state: their Skill Graph, stated goals, constraints, and history, considered as a single connected data structure. The Skill Graph is a subset of the Career Graph, not a synonym for it.

### Skill Graph
A directed graph of individual Skills, connected by Dependency edges, each carrying a current Mastery level for the user. This is the primary data structure in CareerOS and the single source of truth for progress (see Guiding Principle 9).

### Skill Relationship Explorer
A structured, founder-facing projection of one skill’s direct (1-hop) prerequisites and unlocks from the Skill Graph, with optional Roadmap participation context. Read-only — does not infer edges or change planning (ADR-0018). Distinct from Skill Tree (full-graph visualization).

### Skill (Node)
A single, atomically-defined unit of capability (e.g., "Vector embeddings," "Supabase row-level security," "PyTorch autograd"). Every Skill has a name, a description, zero or more Dependencies, and a current Mastery level for the user. Skills are the vertices of the Skill Graph.

### Node
The generic term for any vertex in the Skill Graph. In practice, every Node in V1 is a Skill; the term "Node" is used when referring to graph structure independent of the specific content of the vertex (e.g., "traverse unlocked Nodes").

### Dependency
A directed edge between two Skills indicating that meaningful progress on the target Skill requires some minimum Mastery of the source Skill (e.g., "Backpropagation" depends on "Linear algebra fundamentals"). Dependencies determine which Skills are eligible to be recommended as Tasks.

### Mastery
A user-specific, per-Skill measure of demonstrated competence, expressed on a defined scale (not binary complete/incomplete). Mastery is derived from completed Tasks and, where applicable, direct user or AI Mentor assessment. Mastery decays in confidence over time per Guiding Principle 30, and is never treated as a permanent, one-time-set value.

### Confidence
A user-specific, per-Skill measure of how verified the current Mastery estimate is. Independent of Mastery (Principle 19): higher claimed Mastery does not imply higher Confidence. Confidence is floored by Evidence tier ceilings (non-additive).

### Evidence Extraction Assistant
A confirmation-gated AI Adapter consumer that turns an unstructured learning artifact into structured Evidence **proposals**. Proposal confidence is presentation-only. Evidence and Mastery change only after explicit user confirmation via the Evidence Service (ADR-0022). Distinct from Reflection (structured self-assessment, no LLM) and from Mentor Chat.

### Evidence
An append-only record that supports a change to Mastery and/or Confidence for a Skill. Mastery and Confidence change only via Evidence (AR-04). Types include self-report, reflection, and self-report override, among others documented in the Skill Graph schema.

### Mastery Self-Report Override
An explicit user disagreement with a system-computed Mastery estimate for a Skill, recorded as Evidence of type `self_report_override` (skill-graph-schema.md §5.5). It is weighted like other Tier-1 Self Report Evidence — not an authoritative overwrite of the overlay. Distinct from a Recommendation Override (eligibility signal in the `overrides` table).

### Recommendation Override
A user disagreement with a recommended Skill or Task (“not this skill” / skip), persisted in the `overrides` table as signal for derived eligibility suppression. Does not write Evidence or change Mastery (ADR-0009).

### Progress Score
An aggregate, computed metric summarizing overall advancement toward a stated Goal, derived from Mastery levels across all relevant Skill Graph Nodes weighted by their relevance to that Goal. Distinct from Mastery, which is per-Skill; Progress Score is per-Goal. **Not implemented in V1** — requires `skill_goal_relevance` (deferred; ADR-0016).

### Goal Progress Explanation
A structured, founder-facing projection of progress toward the active Goal using **roadmap stage** and unranked completed / current / remaining skills on the computed Roadmap. Pure read model — does not compute Progress Score, rank contributions, or forecast completion (ADR-0016). Distinct from Roadmap Explanation (path ordering).

### Goal Explorer
A structured, founder-facing, read-only dossier of the active Goal: identity/provenance, recorded constraints, and optional **Current Roadmap** path skill lists. Path skills are planning associations, not goal requirements (ADR-0019). Distinct from Goal Progress Explanation (stage narrative).

### Goal
A user-defined desired future state (e.g., "Become employable as an AI Engineer within 12 months"), captured during Onboarding and revisable at any time. Every recommendation in the system must be traceable to at least one active Goal.

### Constraint
A user-defined limitation on how a Goal can be pursued — most commonly available weekly hours, but also including things like current employment obligations or hard deadlines. Constraints directly bound what the Decision Engine is allowed to recommend.

### Opportunity Assessment
A rare, deterministic projection that detects when a Constraint change unlocks materially more capacity against Planning’s remaining work (`constraint_change_unlock` in V1). Surfaces what changed, why it matters, and what is now possible — UI-only; does not alter ranking or Roadmap generation (ADR-0013). Distinct from Opportunity Adjustment (deferred pipeline stage).

### Roadmap
The current, computed sequence of Missions and Quests projected to move the user from their present Skill Graph state toward a stated Goal, given current Constraints. The Roadmap is always a live, recomputed view (per Guiding Principle 8), never a stored, static document. V1 is skill-granular (ADR-0006).

### Roadmap Explanation
A structured, founder-facing projection of a computed Roadmap into declarative path-level answers (structure, current step, current vs next, blockedBy constraints, effort-as-presentation, goal title). Pure read model — does not reorder or regenerate the Roadmap (ADR-0015). Distinct from per-step `whyHere` captions and from Decision Explanation (which uses a persisted recommendation snapshot).

### Decision Engine
The subsystem (backed by the Claude API) responsible for evaluating the current Skill Graph, Goals, and Constraints, and producing ranked, explainable recommendations for what the user should do next. Also referred to as the Career Intelligence Engine in earlier planning documents — the two terms are treated as synonyms, with "Decision Engine" preferred going forward for consistency.

### Career Intelligence Engine
Deprecated synonym for Decision Engine. Retained here only so historical references resolve correctly; new code and copy should use Decision Engine.

### Mission
A large, multi-week body of work aligned to a specific Goal, composed of multiple Quests (e.g., "Build a working RAG pipeline over personal notes"). Missions are the mid-granularity unit between the long-horizon Roadmap and day-to-day Tasks.

### Quest
A concrete, boundable unit of work within a Mission, typically completable within a few days to two weeks (e.g., "Implement chunking and embedding for the RAG pipeline"). Quests decompose into individual Tasks.

### Task
The smallest actionable unit of work surfaced to the user, typically completable within a single working session (e.g., "Write and test the embedding function for document chunks"). Tasks are what the Daily Task Engine actually recommends. Completing a Task is the atomic event that can move Mastery on one or more Skills.

### Daily Task Engine
The component of the Decision Engine responsible specifically for surfacing the highest-value Task(s) for the current day, given available hours (a Constraint) and current Skill Graph state. Distinct from the broader Roadmap, which operates at Mission/Quest granularity over a longer horizon.

### AI Adapter
The infrastructure shell (AI Tasks + AI Runtime + Providers) that lets CareerOS call LLMs with versioned prompts, structured validation, timeouts/retries, and append-only invocation provenance. Provider-independent (`null`, `anthropic`, `gemini`); does not own Decision, Planning, Mastery, History, or Goal state (ADR-0020, ADR-0021). Distinct from AI Mentor (product conversation) and from Decision Engine (deterministic ranking in V1).

### Capability Registry
A deterministic, code-owned catalog of Capability Manifests for discovery by orchestrators. Holds metadata only (id, version, mutability, slots, dependencies); never executes capabilities or owns business logic (ADR-0027). Distinct from Career Copilot (orchestration) and from AI Runtime (LLM transport).

### Capability Manifest
The self-description of one CareerOS capability: stable immutable `id`, presentation-only `displayName`, category, mutability, required slots, optional dependency ids, and version fields. Validated against `CAPABILITY_MANIFEST_SCHEMA_VERSION` (ADR-0027).

### AI Task
A typed, versioned unit of LLM work: input/output schemas, prompt reference, and input construction. Does not own retries, validation, or provider SDKs (ADR-0020).

### AI Runtime
The adapter orchestrator that loads prompts, calls a Provider, enforces timeout/cancellation/retries, validates structured output, and records provenance. Only validated task DTOs leave Runtime (ADR-0020).

### AI Mentor
The conversational interface (Mentor Chat) through which the user interacts with the Decision Engine in natural language — asking questions, requesting re-explanation of a recommendation, or requesting a re-plan. The AI Mentor surfaces the Decision Engine's reasoning; it is not a separate reasoning system from it. Deferred until after AI Adapter Architecture.

### Mentor Chat
The specific product surface (UI feature) implementing the AI Mentor. "AI Mentor" refers to the reasoning persona/capability; "Mentor Chat" refers to the screen/interface.

### Reasoning Trace
The stored, human-readable explanation attached to any Decision Engine output (a recommended Task, a re-prioritized Skill, a Roadmap change), describing which Goal, Constraint, and Skill Graph state produced that output. Required per Guiding Principle 11; never regenerated inconsistently on demand. In V1 skill recommendations, the immutable `skill_recommendations` row (narrative + factor snapshot) is the trace substrate; a separate `reasoning_traces` table remains deferred (ADR-0014).

### Resume Intelligence
An AI Adapter consumer that composes resume-ready prose from deterministic Resume Facts (Career Graph reads). Sections organize facts; drafts are append-only and never write back to domain state. Distinct from Export (serialization) (ADR-0024).

### Career Gap Analysis
An AI Adapter consumer that summarizes verified strengths, missing evidence (no verified Evidence), and weak mastery (Evidence present but low mastery) from deterministic Gap Facts. Present-tense only; never plans, predicts, or writes domain state. Distinct from Goal Progress Explainability and from Planning (ADR-0025).

### Portfolio Intelligence
An AI Adapter consumer that composes a proof-oriented technical portfolio from deterministic Portfolio Facts (verified Evidence, skills, learning chronology). Featured project order and timeline order are fixed before AI; drafts are append-only content snapshots — not websites or publishing (ADR-0028). Distinct from Resume Intelligence (hiring document).

### Data Export
A read-only ownership capability that assembles and downloads the user’s CareerOS data in plain Markdown or JSON. Does not compose resume prose (ADR-0008).

### Decision Explanation
A structured, founder-facing projection of a persisted decision factor snapshot into declarative answers (why this skill, why now, why not the runner-up, if skipped, goal alignment). Pure read model — does not change ranking (ADR-0014). Distinct from DecisionInspector (engineering factor table) and from Claude-generated prose.

### History Event Log
The Career Graph’s append-only cross-component audit index (`history_events`). Records that domain mutations occurred (references + light payload); does not duplicate domain content and is not an event-sourced rebuild of state (ADR-0007).

### Timeline View
A structured, founder-facing projection of the History Event Log into correlation-grouped journey entries. Presentation-only grouping; preserves each event’s id, timestamp, and type. Not analytics and not event sourcing (ADR-0017). Surfaced by elevating `/history`.

### Onboarding Interview
The structured, conversational intake flow (a V1 core feature) through which a new user's starting Skill Graph, Goals, and Constraints are established. Produces the user's initial Career Graph state.

### Milestone
A significant, user-visible marker of progress along the Roadmap, typically corresponding to completion of a Mission or a meaningful jump in Progress Score. Milestones are checkpoints for reflection, not just celebratory markers.

### Reflection
A structured moment (prompted by the system, typically after a Milestone or a significant plan deviation) where the user reviews recent progress with the AI Mentor and confirms, corrects, or adjusts Goals, Constraints, or self-assessed Mastery.

### Recovery
The system's explicit handling of a broken Streak or missed planned Task(s): treated as new information requiring recomputation of the Roadmap and Daily Task Engine output, never as a failure state requiring justification from the user (per Guiding Principle "Recovery, not shame," see Product Philosophy §9).

### Streak
A count of consecutive days (or active sessions) in which the user engaged with at least one recommended Task. Tracked only as a reflection of genuine engagement, never gamified in a way that penalizes a broken streak beyond triggering a Recovery flow.

### XP (Experience Points)
A numeric representation of accumulated effort, awarded strictly upon verified Task completion tied to Mastery movement on the Skill Graph. XP is never awarded for app opens, streak maintenance alone, or other non-substantive interactions (per Guiding Principle 21).

### Skill Tree
The visual representation (UI component) of the Skill Graph, rendered so Dependencies and Mastery levels are legible at a glance. "Skill Graph" refers to the underlying data structure; "Skill Tree" refers specifically to its visualization.

### Boss Battle
A significant, higher-stakes Quest or Mission-completion checkpoint designed to validate real Mastery under more demanding conditions than a routine Task (e.g., "build and deploy a small end-to-end AI feature with no scaffolding, within one week"). Used sparingly, reserved for genuine capability checkpoints, not for routine gamification.

### Learning Velocity
A computed rate metric: Mastery gained (across the Skill Graph) per unit of time invested, used by the Decision Engine to detect drift between stated timeline and actual pace (per Guiding Principle 5 and Product Philosophy §11).

### Knowledge Graph
Reserved term, not currently a distinct entity from the Skill Graph in V1. If a future version introduces a broader graph of general knowledge/content (separate from user-specific Mastery), that structure will be called the Knowledge Graph to avoid collision with Skill Graph. Not to be used interchangeably with Skill Graph in current code or copy.

### Domain Advantage
A Skill or cluster of Skills where the user's prior background (mechanical engineering, industrial systems) provides a Mastery head start or unique relevance relative to a generic learner. Explicitly modeled in the Skill Graph so the Decision Engine can weight recommendations that compound this advantage rather than treating all users as generic blank slates.
