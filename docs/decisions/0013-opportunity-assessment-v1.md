# 0013 — Opportunity Assessment v1 (projection)

Status: Accepted
Date: 2026-07-21
Milestone: M16 (Sprint 16 — Opportunity Assessment v1)

## Context

With Risk Assessment shipped (ADR-0011), V1 still needs the complementary
honesty surface: rare **Opportunity** detection when a Constraint change unlocks
materially more capacity (`career-intelligence-engine.md` §4.10 / §7; EX-09).
The documented stub is **constraint-change unlock only** — not market signal,
Domain Advantage path discovery, or Opportunity Adjustment of ranking.

Sprint 16 adds Opportunity as a **product surface** — an explainable assessment —
not Opportunity Adjustment, not Claude, not persistent Opportunity State.

## Decision

Add an Opportunity subsystem that:

1. Defines **Opportunity Policy v1** (`OPPORTUNITY_POLICY_VERSION`): increase
   thresholds, active window, unlock materiality vs Planning remaining hours,
   and confidence rules.
2. Internally pipelines **Constraint Change → Opportunity Cause → Opportunity
   Assessment** so future cause kinds stay composable.
3. Purely computes whether a `constraint_change_unlock` cause is active.
4. Surfaces a dashboard panel only when `isActive`.
5. Writes nothing as opportunity state — no table, dismissal, or surfaced flag.
6. Includes a **minimal hours editor** solely to produce `constraint_updated`
   History facts (not general constraint management).

### Assessment vs Adjustment

| | Opportunity Assessment (this ADR) | Opportunity Adjustment (deferred) |
|---|---|---|
| Intent | “Capacity unlocked — here’s why” | Inject/boost candidates in ranking |
| Effect | UI panel only | Changes Task Generation pipeline |
| Ranking | Untouched | Would alter eligibility/order |

Collapsing them would turn a honesty surface into a silent re-router. Sprint 16
keeps Assessment **UI-only** so ranking, Roadmap generation, suppression,
mastery, and missions stay untouched (ADR-0002 / 0006 / 0009).

### Why Opportunity is projection-only

Opportunity answers a question about **current facts** (History constraint
changes + Planning remaining work + deadline). Storing `opportunity_state`
would duplicate judgment, drift from History, and invite mutation of signal.
Identical inputs + policy version + injected `now` → identical assessment.
AD-15 append-only snapshots remain deferred until trend UI needs them.

### Why no persistent opportunity state / surfaced flag

Docs mention `surfaced_to_user` on Opportunity State snapshots. Persistence is
deferred with AD-15. Rarity is enforced by a **time window**:
`assessment_time - event_time ≤ OPPORTUNITY_ACTIVE_WINDOW_DAYS`. When the window
elapses, the assessment is inactive — no dismiss row required.

### Why Planning owns remaining work

Materiality (“does this hours increase unlock meaningful capacity?”) must use
the same remaining-effort numbers the Roadmap shows. Opportunity **reads**
`remainingHoursMin` / `remainingHoursMax` from `getRoadmap`. Re-deriving effort
would drift from the route the user sees (same stance as Risk / ADR-0011).

### Why Opportunity has flat dependencies

Opportunity reads **Constraints** (via Career Graph for deadline context),
**History** (`constraint_updated`), and **Planning**. It must not import Risk,
Recovery, or Decision — those are peer projections / engines. A flat graph keeps
reasoning auditable and avoids hidden coupling (Risk ↔ Opportunity tension is
surfaced by showing both panels independently when each is active).

### Cause composability

V1 only emits `constraint_change_unlock`. Modeling Cause separately from
Assessment lets future sources (e.g. Domain Advantage combinations) add causes
without rewriting Assessment assembly or UI contracts.

### Minimal hours update

Onboarding set hours once; without updates, constraint-change unlock never
fires. A thin editor updates `constraints` + `profiles.available_hours_per_week`
and appends History. It is not a constraint-management product surface.

## Consequences

- Increasing weekly hours can activate Opportunity Assessment when policy
  thresholds pass; the panel explains what changed, why it matters, and what is
  now possible — without recommending a next task.
- History gains `constraint_updated` / entity kind `constraint`.
- Opportunity Adjustment, market/external signals, AI discovery, Mentor chat,
  Claude, and Adaptive ranking remain deferred.

### Divergences / deferred (deliberate, not silent)

- Persisted Opportunity State snapshots (AD-15) and `surfaced_to_user`
- Opportunity Adjustment of Decision / Task Generation
- Domain Advantage / asymmetric path detection beyond constraint-change stub
- External market signal
- Broader constraint management UI
