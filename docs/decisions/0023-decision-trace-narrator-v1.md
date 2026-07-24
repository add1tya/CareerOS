# 0023 — Decision Trace Narrator v1

Status: Accepted
Date: 2026-07-22
Milestone: M25 (Sprint 25 — Decision Trace Narrator v1)

## Context

ADR-0014 already projects persisted recommendation `factors` into structured
Decision Explanations. AR-10 allows LLM use only to render already-determined
trace structure into prose — not to decide content.

Sprint 25 adds that prose layer as the second AI Adapter product consumer
(`trace.narrate`), after Evidence Extraction (ADR-0022).

## Decision

Add **Decision Trace Narrator v1**:

1. Pipeline: **Decision Trace → Trace Facts → Narrative Facts → Narrative View → UI**.
2. Trace Facts are assembled deterministically from Explainability (never by
   re-ranking).
3. AI Task `trace.narrate` produces prose; **Narrative Facts** validate grounding
   citations against Trace Fact atom ids.
4. Narratives are **immutable** snapshots; new `TRACE_NARRATOR_VERSION` yields a
   new row (unique per recommendation + narrator version).
5. If Trace Facts are **insufficient**, **do not call AI** — show deterministic
   insufficient copy.
6. Structured Explainability UI always remains visible; narration is additive.
7. Decision Engine remains sole owner of ranking, recommendation, factors, and
   confidence.

### Explainability vs Narration

| | Explainability (ADR-0014) | Narration (this ADR) |
|---|---------------------------|----------------------|
| Output | Declarative fact strings | Human-readable prose |
| Deterministic? | Yes | Wording may vary; grounding must not |
| Influences ranking? | Never | Never |

### Trace Facts vs Narrative Facts

- **Trace Facts:** deterministic atoms + section source strings from the
  persisted decision snapshot / explanation.
- **Narrative Facts:** validated prose + **citations** (atom ids) per section.

### Why narration is presentation only

Prose helps founders read the decision. It must not become a second source of
recommendation truth. Template `narrative` and `factors` on
`skill_recommendations` stay Decision-owned.

### Why AI never influences recommendations

The narrator reads a frozen snapshot. It has no write path into ranking,
eligibility, Planning, Evidence, or Mastery.

### Why every sentence must be grounded

Ungrounded LLM text would invent reasons (Risk, Momentum, alternate skills).
Citations to Trace Fact atoms make inventing detectable and keep Principle 17
honest.

## Consequences

- Lazy “Generate narrative” on the Recommendation card.
- Table `decision_trace_narratives` + `ai_invocations` provenance.
- Mentor chat, re-ranking, and planning advice remain deferred.
