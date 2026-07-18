# 0005 — Reflection with a confirmation gate (v1)

Status: Accepted
Date: 2026-07-18
Milestone: M8 (Sprint 8 — Reflection v1)

## Context

Sprint 7 made Evidence the single source of truth for progress, but the only
producer of Evidence was Task completion (Tier-1 self-report). The documented
system also lets the user contribute structured self-assessment — **Reflection**
— which is a V1 requirement (Definition of Done #8; PR-17; AD-19;
`career-intelligence-engine.md` §4.4/§7). ADR-0004 explicitly deferred Reflection
"until the Evidence loop closed… the future Reflection and Mentor subsystems
[affect progress] by writing Evidence, never by mutating the overlay." That gate
is now passed.

Sprint 8 adds a second, user-driven path into the Evidence pipeline, gated by
explicit human confirmation, and entirely deterministic (rule-based; no Claude).

## Decision

Add a `reflections` table and a **Reflection subsystem**. The user records a
structured self-assessment of one skill; a pure, rule-based Reflection Engine
derives a **proposed** update; on explicit confirmation the proposal is committed
as Reflection-type (Tier-2) Evidence through the Sprint-7 Evidence subsystem.

### Why Reflection is a separate capability from Task completion

They differ on every axis that matters architecturally: **trigger** (system/
execution signal vs. user-initiated), **evidence tier** (Tier-1 self-report vs.
Tier-2 artifact), and **commit model** (automatic on completion vs.
confirmation-gated). Task completion is a by-product of *doing work*; Reflection
is a deliberate act of *self-modelling*. Collapsing them would force one flow to
carry the other's rules. Keeping Reflection its own subsystem (owning the
`reflections` lifecycle) while reusing the shared Evidence core keeps each flow
simple and the Evidence subsystem the single writer of progress.

### Why Reflection requires explicit confirmation

Self-model updates must never happen silently (`career-intelligence-engine.md`
§4.4; AD-19: "Reflection confirmation gate before Mastery commit"). The user is
the authority on their own self-assessment, so the system **proposes** and the
user **disposes**. We model the three ownership states distinctly
(`career-graph-schema.md` §3.10): raw response (`response_text`), system
interpretation (`derived_updates`), and confirmed outcome (`status` /
`confirmed_at`). A declined reflection is preserved as signal, not deleted.

### Why Reflection produces Evidence instead of mutating the overlay directly

AR-04: there is no direct-write path to mastery/confidence. Routing Reflection
through Evidence means (a) every mastery change stays attributable and
auditable, (b) the overlay remains a pure replay of the append-only Evidence log
(ADR-0004 — the reflection commit reuses the exact same `applyEvidence` reducer,
snapshotting `mastery_policy_version`), and (c) the confidence tier ceiling is
enforced uniformly (reflection is Tier-2, so it can raise Confidence toward ~0.55
but never fabricate verified-level certainty). A direct overlay write would
bypass all three guarantees.

### Why typed provenance was chosen

Reflection-produced Evidence links back via a typed FK `generated_from_reflection_id`
(mirroring `generated_from_task_id`), rather than a polymorphic `origin_kind` +
`origin_id`. Explicit foreign keys preserve referential integrity and keep the
schema self-describing; the small number of V1 Evidence sources does not justify
sacrificing integrity for premature generalization. New sources can add their own
typed column when they actually arrive.

### Why structured input instead of free-text interpretation in V1

The V1 Reflection Engine is rule-based and deterministic (roadmap Phase 5 #14).
Inferring mastery from free-text prose would require exactly the probabilistic/LLM
reasoning that is deferred to Phase 6 — and doing it with hand-written rules would
be dishonest pseudo-NLP. So the proposal is driven by a **structured
self-assessment selection** (a small discrete scale mapped to implied mastery via
configuration), and free text is stored only as qualitative context
(`skill-graph-schema.md` §6: Reflection is "primarily useful for updating the
Learning Profile… rather than moving Mastery directly"). This keeps the engine a
pure function and the system honest.

### Immutability, versioning, and provenance (refinements)

- A reflection is **immutable once created**: its inputs and `derived_updates`
  never change. To revise, the user creates a new reflection (preserving intent
  and the audit trail). The only permitted mutation is the one-way status
  transition `proposed → confirmed | declined`, enforced at the database via an
  RLS `UPDATE … USING (status = 'proposed')` clause.
- The reflection row snapshots **both** `reflection_engine_version` and the
  `mastery_policy_version` assumed at proposal time, plus the **evaluated skill
  state** (mastery/confidence/status) the user reflected on — so any future
  explanation can reproduce exactly what was proposed, under which rules, against
  which state.
- The Reflection Engine is a **pure function** (`ReflectionInput → DerivedUpdate[]`)
  with no knowledge of persistence, users, Evidence, confirmation, or actions.

## Consequences

- Confirming a reflection visibly raises a skill's Confidence toward the Tier-2
  ceiling (~0.55) and nudges Mastery via the standard blend; declining changes
  nothing but is kept as signal.
- One new table (`reflections`) + one nullable FK column on `skill_evidence`;
  RLS owner-only with DB-enforced post-decision immutability.
- The Evidence subsystem now serves two sources through one shared core
  (`appendEvidenceAndFold`), so replayability and the confidence ceiling apply
  uniformly.
- New `/reflect` route and nav entry.

### Divergences / deferred (deliberate, not silent)

- **Single-skill reflections** in V1 (`derived_updates` kept as a list for
  forward-compatibility).
- **Deferred entirely:** Claude/LLM interpretation, automatic/milestone reflection
  triggers (EX-11), Learning Profile updates, Goal proposals, multi-skill
  reflections, History events, the Reasoning-Trace entity, and adaptive planning.
