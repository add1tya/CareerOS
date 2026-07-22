# 0010 — Recovery Engine v1 (History projection)

Status: Accepted
Date: 2026-07-20
Milestone: M13 (Sprint 13 — Recovery Engine v1)

## Context

CareerOS now recommends, executes, learns, audits, exports, and accepts
overrides. V1 Definition of Done #7 and PR-16 still require a **Recovery flow
after absence** — re-engagement without shame (Guiding Principle 5 / 21;
`career-intelligence-engine.md` §4.5). Sprint 10’s History Event Log is the
prerequisite: gap detection “is a History query (time since last qualifying
event) before it is anything else” (`career-graph-schema.md` §3.14).

Sprint 13 introduces exactly that capability as a **computed projection**, not
a new mutable domain store. Risk Engine, Velocity, Momentum, forecasting,
automatic Reflections, and Claude remain deferred.

## Decision

Add a Recovery subsystem that:

1. Defines **Recovery Policy v1**: `QUALIFYING_RECOVERY_EVENTS` +
   `ABSENCE_THRESHOLD_DAYS`, versioned together as `RECOVERY_POLICY_VERSION`.
2. Purely computes `RecoveryState` from History facts + injected `now`.
3. Surfaces an honest dashboard panel when status is `absent`.
4. Writes nothing — no recovery table, no acknowledgement History event in V1.

### Recovery as a projection over History

Recovery is a **read model**: the same append-only History facts the rest of the
system already trusts, interpreted through a versioned policy. There is no
`in_recovery` flag to get out of sync with reality. If History changes (new
qualifying event), the next load recomputes Recovery. This matches the project’s
preference for derived views over stored judgments (Principle 8 / Protocol §4).

### Recovery Policy versioning

Policy v1 includes:

- **Qualifying events** (`QUALIFYING_RECOVERY_EVENTS`): engagement signals only
  — `task_completed`, `evidence_recorded`, `reflection_confirmed`. Passive
  recommendation or mission writes do not fake “activity.”
- **Absence threshold** (`ABSENCE_THRESHOLD_DAYS`, default 7).

Changing either increments `RECOVERY_POLICY_VERSION`. The detector references the
central config; it does not embed event-name literals.

### Why Recovery does not mutate domain state

Recovery answers *“You’ve been away — here’s orientation.”* It must not:

- change ranking or suppression,
- write Evidence or Mastery,
- rewrite or abandon Missions.

Those belong to Decision, Override, Evidence, and Execution. Recovery only
**informs the UI**. Existing Decision/Planning recomputation on dashboard load
already refreshes “what’s next” from current facts without Recovery owning that
pipeline.

### Why Recovery precedes Risk

Risk (§4.8) needs Learning Velocity, Momentum trends, and snapshot persistence —
a larger deterministic engine. Recovery’s core (History gap → honest
re-engagement) unblocks DoD #7 with History alone. Shipping Risk first would
expand scope without delivering the absence UX. Recovery can later *read* Risk
when it exists; V1 does not invent Risk inside Recovery.

### Why automatic Reflection remains deferred

EX-11 / PR-17: Reflections in V1 are user-initiated. A Recovery panel may link
to Reflect later; it must not auto-create `recovery_check_in` Reflections or
bypass the confirmation gate (ADR-0005).

### Supporting choices (refinements)

- **No acknowledgement event in V1** — detection works entirely from History.
  Future ack would record *user interaction*, not Recovery itself.
- **Export unchanged** — Recovery is computed; History already exports the
  underlying facts. No Export schema v3 for this sprint.
- **Statuses:** `engaged` | `absent` | `no_activity_yet` (honest empty History).

## Consequences

- Dashboard shows a calm “Welcome back” panel when absent; otherwise nothing.
- Pure detector is unit-testable with injected `now`.
- Risk, Velocity, Momentum, forecasting, automatic reflections, Claude, and
  adaptive behavior remain deferred.

### Divergences / deferred (deliberate, not silent)

- Risk Engine / risk_state snapshots
- Learning Velocity and Momentum as first-class computed engines
- `recovery_acknowledged` History events
- Automatic `recovery_check_in` Reflections
- Constraint auto-adjustment after absence
- Export computed_snapshots.recovery
