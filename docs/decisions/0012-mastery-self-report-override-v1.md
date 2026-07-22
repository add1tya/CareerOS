# 0012 — Mastery Self-Report Override v1

Status: Accepted
Date: 2026-07-20
Milestone: M15 (Sprint 15 — Mastery Self-Report Override)

## Context

`skill-graph-schema.md` §5.5 requires that when a user disagrees with a
system-computed Mastery estimate, the disagreement is recorded as Evidence of
type `self_report_override` — not as a silent overwrite of the overlay (AR-04 /
Guiding Principle 18). Sprint 12 (ADR-0009) shipped **recommendation / task**
overrides via the `overrides` table; mastery correction remained deferred.

Sprint 15 closes that gap with a thin, Evidence-only path. No new History event
types, no Export schema bump, no Reflection merge, no Claude.

## Decision

1. Record mastery corrections as **`skill_evidence`** rows with
   `type = self_report_override`, Tier 1, `source = user`.
2. Fold them through the **existing** `appendEvidenceAndFold` /
   `applyEvidence` pipeline — the mastery reducer is unchanged.
3. Map UI selections through versioned **`MASTERY_OVERRIDE_SCALE`**
   configuration to numeric `impliedMastery` before the reducer sees them.
4. Surface the control on the **Skill Tree** (skill-centric), not Reflection.
5. Emit the existing **`evidence_recorded`** History event only.
6. Leave Export unchanged (Evidence already exports).

### Recommendation Override vs Mastery Override

| | Recommendation / Task Override (ADR-0009) | Mastery Self-Report Override (this ADR) |
|---|---|---|
| Intent | “Not this skill / skip this task” | “My mastery estimate is wrong” |
| Persistence | `overrides` table | `skill_evidence` (`self_report_override`) |
| Effect | Eligibility suppression (derived) | Weighted Mastery via Evidence policy |
| Evidence? | No | Yes (AR-04) |
| History | `recommendation_overridden` / `task_skipped` | `evidence_recorded` |
| Confidence | Unaffected | Still Tier-1 ceiling only |

Collapsing them would either invent progress from a skip or force ranking
concerns into the Evidence pipeline. They remain separate subsystems.

### Why mastery corrections are Evidence

Mastery and Confidence change **only via Evidence** (AR-04). An override that
wrote `user_skill_mastery` directly would bypass the append-only log, break
replay (ADR-0004), and treat the user’s claim as authoritative truth. §5.5 is
explicit: the override is a distinct Evidence record; the estimate remains the
**output of the Evidence policy**, not the claimed value.

Self-report overrides are therefore **signal**, not ground truth — the same
philosophical stance as recommendation overrides (Principle 18), expressed
through the progress pipeline instead of the eligibility pipeline.

### Why Tier-1 weighting exists

Self Report and Self Report Override share Tier 1 (§6–§7). A single override
moves mastery by the tier’s learning rate (confidence ceiling as rate in
`applyEvidence`), not to 100% of the stated value. Elevating an explicit
correction above ordinary self-report would reward assertiveness over evidence
quality and contradict the documented taxonomy. Higher-tier self-assessment
remains deferred.

### Why confidence remains independent

Mastery and Confidence are distinct dimensions (Principle 19). Claiming a higher
mastery must not inflate confidence: confidence is the ceiling of the highest
Evidence tier attached, non-additive (AD-11). Tier-1 overrides can nudge mastery
while confidence stays capped at ~0.30 until stronger Evidence arrives.

### Why the reducer remains unchanged

`applyEvidence` already implements §5.6 weighted blend + non-decreasing mastery
+ independent confidence. Sprint 15 only supplies a new **source** of
`PolicyEvidence` (`tier` + `impliedMastery`). Changing formulas would couple a
UI feature to policy reinterpretation and force a `MASTERY_POLICY_VERSION` bump
without a documented policy change. Calibration lives in
`MASTERY_OVERRIDE_SCALE` / `MASTERY_OVERRIDE_SCALE_VERSION` instead.

### Scale configuration vs UI labels

`MASTERY_OVERRIDE_SCALE` is versioned configuration. The UI may show human
labels; the server action accepts only `level_id`; the Evidence service maps
`level_id → impliedMastery`. The reducer never receives labels.

### Immediate commit (no Reflection gate)

Reflection (AD-19) proposes then confirms because it is a structured narrative
artifact with Tier-2 weight. A mastery override is an explicit correction the
user intends to apply now; delaying it behind a second confirmation would blur
it into Reflection and contradict “skill-centric correction.” Locked skills are
rejected (same gate as Reflection).

## Consequences

- Founder can correct a skill’s mastery estimate from the Skill Tree; History
  shows `evidence_recorded`; Export lists the Evidence row.
- Overlay cache stays replay-equal to the Evidence log.
- Recommendation overrides, Risk Adjustment, higher-tier self-assessment, AI
  interpretation, adaptive mastery, Mentor chat, and Claude remain deferred.

### Divergences / deferred (deliberate, not silent)

- Higher-than-Tier-1 self assessment
- LLM / AI interpretation of free-text correction notes
- Adaptive mastery / Learning Profile feedback from override patterns
- Risk Adjustment of recommendations
- Mentor chat / Claude
- Optional free-text note persistence (no schema change this sprint)
