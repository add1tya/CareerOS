# 0009 — Overrides as Signal (v1)

Status: Accepted
Date: 2026-07-20
Milestone: M12 (Sprint 12 — Overrides as Signal)

## Context

CareerOS now recommends, plans, executes, learns, reflects, audits, and exports.
Product philosophy still requires: *the system recommends; the user decides.*
Guiding Principle 18 / PR-15: when the user disagrees, the system logs that as
**signal**, not as an error to minimize. Phase 3 exit criteria require
override/skip logged with a reason payload; the E2E path is
“Skip task → override logged → different recommendation.”

Sprint 12 introduces exactly that capability for **recommendation and task**
overrides. Mastery Self Report Override Evidence (§5.5) is specified in
ADR-0012 (Sprint 15).

## Decision

Add an append-only `overrides` table and an Override subsystem that:

1. Persists user intent (`recommendation_overridden`, `task_skipped`) with
   structured `reason_code` + optional `reason_text`.
2. Emits History events (`recommendation_overridden`, `task_skipped`).
3. Derives **Suppression** as a pure function of overrides + evidence — never
   stored.
4. Filters Decision Engine / Roadmap **eligibility** only; leaves
   `compareByFactors` untouched.
5. Never mutates existing Mission rows when a recommendation is overridden.

Export schema bumps to **v2** with an `overrides` section.

### Recommendation Override vs Mastery Override

| | Recommendation / Task Override (this sprint) | Mastery Override (§5.5 / ADR-0012) |
|---|---|---|
| Intent | “Not this skill / skip this task” | “My mastery estimate is wrong” |
| Persistence | `overrides` table | `skill_evidence` type `self_report_override` |
| Effect | Eligibility suppression (derived) | Weighted Mastery/Confidence via Evidence |
| Evidence? | No (skip ≠ progress) | Yes (AR-04) |

Collapsing them would either invent progress from a skip or force ranking
concerns into the Evidence pipeline. They stay separate.

### Why suppression is derived rather than stored

Override rows are facts (“the user said X at time T”). Whether a skill is
currently ineligible is a **policy** over those facts plus Evidence. Storing
`active` / `inactive` flags would duplicate state, drift from Evidence, and
invite mutation of signal. V1 rule (pure `computeSuppressedSkillKeys`):

> A skill is suppressed iff its latest `recommendation_overridden` override has
> no Evidence with `recorded_at` strictly after that override’s `created_at`.

Task skips do not suppress recommendation eligibility.

### Why reason codes never affect ranking

Reason codes classify *why* the user disagreed. Ranking answers *which eligible
skill is highest value*. Mixing reasons into scores would invent weights the
docs do not define and break the deterministic lexicographic comparator
(ADR-0002). Codes may only remove a candidate from the pool; `compareByFactors`
is unchanged.

### Why overrides are append-only

Disagreement is historical signal. Updating or deleting an override would rewrite
intent and break audit/Export. To “reconsider,” the user records new Evidence on
that skill (clearing derived suppression) — they do not erase the prior override.

### Why Missions are never rewritten

Missions are frozen execution instances (ADR-0003). A recommendation override
means “don’t recommend this skill next,” not “rewrite the Mission I already
generated.” Future recommendations may create **new** Missions; historical
Missions remain immutable provenance.

## Consequences

- Decision Engine and Planning Engine load the same derived suppression set so
  `head(Roadmap)` stays aligned with the Recommendation.
- Skip advances quests when all tasks are completed **or** skipped; no Evidence
  on skip.
- History + Export include overrides; `EXPORT_SCHEMA_VERSION = 2`.
- Mastery overrides shipped separately in ADR-0012. Velocity adaptive ranking,
  LLM reason interpretation, Mentor chat, and Claude remain deferred.

### Divergences / deferred (deliberate, not silent)

- ~~Mastery `self_report_override` Evidence flow~~ → ADR-0012
- Learning from override patterns into Learning Profile / adaptive ranking
- Explicit “reconsider skill” UI (Evidence on that skill clears suppression)
- Abandoning Missions as a first-class flow
