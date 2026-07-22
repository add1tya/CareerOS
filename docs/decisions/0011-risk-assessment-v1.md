# 0011 — Risk Assessment v1 (projection)

Status: Accepted
Date: 2026-07-20
Milestone: M14 (Sprint 14 — Risk Assessment v1)

## Context

With Recovery shipped (ADR-0010), the remaining non-Claude V1 Definition of Done
item for honesty under pressure is **Risk assessment visible when elevated**
(DoD #9 / PR-18 / `career-intelligence-engine.md` §4.8). The deterministic
platform already holds the inputs Risk needs: Goals, Constraints, History, and
Planning’s remaining-effort projection.

Sprint 14 adds Risk as a **product surface** — an explainable assessment — not
Risk Adjustment of recommendations, not Opportunity Assessment, not Claude.

## Decision

Add a Risk subsystem that:

1. Defines **Risk Policy v1** (`RISK_POLICY_VERSION`): thresholds, assessment
   window, engagement event set, formulas, and confidence rules.
2. Purely computes **pace**, **scope**, and **burnout** independently, then
   assembles a `RiskAssessment`.
3. Surfaces a dashboard panel only when any dimension is `elevated` or `high`.
4. Writes nothing — no mutable risk state, no Export schema bump.

### Risk as a projection

Risk is a read model over existing domain facts (and Planning’s computed
remaining hours). It is not a second source of truth and is not persisted as
flags. Identical inputs + policy version + injected `now` → identical
assessment. AD-15 append-only snapshots remain deferred until trend UI needs them.

### Independent risk dimensions

| Dimension | Signal (V1) | Does not use |
|---|---|---|
| **Pace** | Engagement events/week in the policy window vs expected rate | Remaining hours, deadline |
| **Scope** | Planning `remainingHours*` vs `hours/week × weeks to deadline` | Engagement event counts |
| **Burnout** | Engagement intensity in window vs hour-budget capacity proxy | Deadline, remaining Roadmap hours |

Dimensions are combined only when building the final assessment / `isElevated`
flag. No dimension reads another dimension’s output.

### Risk Policy versioning

Changing thresholds, windows, formulas, engagement allowlists, or confidence
rules requires incrementing `RISK_POLICY_VERSION`. Policy constants live in
`risk-types.ts`; the assessor consumes them rather than embedding magic numbers.

### Why Planning owns remaining effort

Scope risk must not re-implement “how much work is left.” The Planning Engine
already projects remaining hours on the Roadmap (ADR-0006). Risk **reads**
`remainingHoursMin` / `remainingHoursMax` from `getRoadmap`. Duplicating that
math would drift from the route the user sees.

### Why Recovery is not an input

Recovery and Risk both project from History. Wiring Risk → Recovery (or the
reverse) would create a hidden dependency chain and couple two product meanings
(absence vs feasibility pressure). Each keeps a **flat** dependency graph:
History (+ Goals/Constraints/Planning for Risk).

### Why Risk does not modify Decision

V1 DoD asks for risk to be **visible**. Risk Adjustment (re-ranking under
elevated risk) is a separate pipeline stage and would change the deterministic
recommendation comparator’s outcomes indirectly. Sprint 14 keeps Risk **UI-only**
so ranking, suppression, mastery, and missions stay untouched (ADR-0002 / 0009).

## Consequences

- Dashboard shows an honest Risk panel when elevated; otherwise silent.
- Sparse History lowers confidence on pace/burnout; missing deadline/hours lowers
  confidence on scope — never fake certainty.
- Risk Adjustment, Opportunity Adjustment, trend snapshots, standalone Velocity,
  Mentor chat, Claude, and adaptive behavior remain deferred.

### Divergences / deferred (deliberate, not silent)

- Persisted `risk_state` snapshots (AD-15)
- Risk Adjustment of Decision Engine candidates
- Opportunity Assessment → ADR-0013; Opportunity Adjustment still deferred
- Standalone Learning Velocity / Momentum engines
- Export schema changes for Risk
- Feeding Risk into Recovery or vice versa
