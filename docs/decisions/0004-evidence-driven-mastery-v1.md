# 0004 — Evidence-driven Mastery/Confidence (feedback loop v1)

Status: Accepted
Date: 2026-07-17
Milestone: M7 (Sprint 7 — Evidence & Mastery v1)

## Context

Sprints 4–6 give us a Skill Graph, a deterministic Decision Engine, and an
Execution Engine (Recommendation → Mission → Quest → Task). But completing a Task
produced no learning signal — Mastery and Confidence were frozen at generation
time. Sprint 7 closes the loop:

```
Task completion → Evidence → Mastery/Confidence + status → Skill Graph
```

This is the documented next capability (`implementation-roadmap.md` Phase 3 items
4–5; Phase 5 exit "completion → Evidence → Mastery update"; V1 DoD #4–#5). It is
fully deterministic — no Claude, no LLM (AR-10, Principle 5).

The domain rules are already specified: Evidence is the atomic unit of proof
(`skill-graph-schema.md` §6); Mastery/Confidence change only via Evidence (AR-04,
§5.4); Evidence is append-only (AR-15, §9.6/§10.1); Confidence tier ceilings are
non-additive (AD-11, §7); status is system-derived from continuous values (§4).

## Decision

Add an append-only `skill_evidence` table and a pure, versioned **mastery policy**
that folds Evidence into the `user_skill_mastery` overlay. Completing a Task emits
a plain completion **signal**; a separate **Evidence subsystem** consumes it,
appends one Evidence record, and recomputes that skill's Mastery, Confidence, and
status. V1 Evidence from task completion is self-attested (Tier 1).

Key structures:

- `skill_evidence` (append-only; select/insert own, no update/delete): `type`,
  `tier`, `implied_mastery`, `content_ref`, `source`, `generated_from_task_id`,
  `mastery_policy_version`, `recorded_at`.
- `user_skill_mastery` gains `last_evidence_id`, `highest_tier_evidence_id`,
  `evidence_count`, `mastery_policy_version`.
- `tasks` gains `evidence_ref` (bidirectional provenance + idempotency key).
- `mastery-policy.ts` — pure reducer (`applyEvidence`, `deriveStatus`,
  `replaySkillOverlay`); `MASTERY_POLICY_VERSION`.
- `evidence-types.ts` — all domain constants as configuration.
- `evidence-service.ts` — the only writer of Evidence and Evidence-derived state.

### Why Evidence is the single source of truth

There is no direct-write path to Mastery/Confidence (AR-04, §5.4). Every value is
attributable to an append-only Evidence record. This makes progress **honest and
auditable**: we can always answer "why is this skill at this mastery?" by pointing
at the exact Evidence, and no code path can inflate progress without leaving a
permanent, immutable record. It also gives the future Reflection and Mentor
subsystems a single, well-defined way to affect progress — by writing Evidence,
never by mutating the overlay.

### Why the overlay is a disposable cache

`user_skill_mastery` stores current Mastery/Confidence/status only as a
**materialized reduction** of the Evidence log — a read optimization. Treating it
as a cache (not a source of truth) keeps a single source of truth (the Evidence
log) and means a bug in the cache is recoverable: it can be rebuilt, never
"lost". It also lets the read model evolve (extra columns, denormalization)
without ever risking the authoritative history.

### Why replayability is an architectural goal

The mastery policy is a **pure fold**: the incremental service path applies the
same `applyEvidence` reducer, one record at a time, that a from-scratch
`replaySkillOverlay(evidenceLog)` would. So the overlay always equals a full
replay of the Evidence log. This is deliberate: it guarantees the cache and the
log can never silently diverge, and it means a future policy revision can be
validated (or the entire overlay rebuilt) simply by replaying history. Sprint 7
updates incrementally for simplicity, but nothing in the architecture prevents a
rebuild — the service boundaries were drawn to preserve that option.

### Why policy versions are persisted with Evidence

Each Evidence row snapshots the `mastery_policy_version` that interpreted it (in
addition to the version on the overlay). Because interpretation rules will evolve
(calibration, new tiers), a bare Evidence log would otherwise become ambiguous:
you couldn't know which formula produced a historical value. Snapshotting the
version keeps every record **deterministically replayable under the exact policy
that produced it**, so future revisions never rewrite the meaning of past
Evidence — the same discipline we apply to execution `template_version`
(ADR-0003) and database migrations.

### Why Mastery and Confidence remain separate dimensions

Mastery is the *estimate of capability*; Confidence is *how verified that
estimate is*. They are stored and updated independently (roadmap B.1). This is
what lets the system be honest: completing self-reported tasks can raise Mastery
meaningfully while Confidence stays capped at the Tier-1 ceiling (~0.30), because
self-report — however much of it — cannot verify capability (non-additive
ceilings, AD-11 / §7). Collapsing them into one number would either overstate
certainty or understate progress. Keeping them distinct also drives the status
machine correctly (`verified`/`mastered` require both high mastery *and* high
confidence, hence higher-tier Evidence).

## Consequences

- Completing tasks now moves a skill `available → learning → practicing`, with
  Confidence honestly capped; the Skill Tree shows the two dimensions distinctly.
- The Decision Engine candidate pool now includes in-progress skills so the
  recommendation stays stable while a user works (no thrash); it changes only
  when a skill leaves the pool (mastered) or new skills unlock.
- One new append-only table + three overlay/task columns; RLS owner-only.
- The Evidence subsystem is the sole writer of progress; the Execution Engine
  stays free of learning logic (clean subsystem boundary).

### Divergences / deferred (deliberate, not silent)

- **`verified` / `mastered` are unreachable in V1** — they require artifact/
  mentor-tier Evidence (Confidence > 0.7), which is deferred. Not simulated.
- **Weighted-update formula is a proposal.** `skill-graph-schema.md` §5.6
  specifies weighted blending conceptually but no closed form. V1 uses
  `next = current + (implied − current) × tierCeiling`, clamped to never
  decrease, with a configurable self-report implied-mastery constant. Recorded
  here (and versioned) so it can be recalibrated deliberately.
- **Confidence = highest-tier ceiling (flat).** A count/recency-weighted rise
  toward the ceiling is deferred; the flat rule is honest and non-additive.
- **Deferred entirely:** Reflection, Claude/LLMs, higher-tier Evidence,
  Confidence time-decay (§5.3), adaptive planning, XP, streaks, mastery-weighted
  ranking, and a generic `skill_node_history` event log (the append-only
  Evidence log already provides the audit trail for progress).
