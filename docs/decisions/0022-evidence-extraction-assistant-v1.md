# 0022 — Evidence Extraction Assistant v1

Status: Accepted
Date: 2026-07-22
Milestone: M24 (Sprint 24 — Evidence Extraction Assistant v1)

## Context

ADR-0020 delivered the AI Adapter. The first product consumer must exercise
Task → Runtime → validated DTO → **Evidence gate**, without letting the model
own Mastery, Planning, Decision, History, or Goal state.

Founders accumulate unstructured learning artifacts (course notes, READMEs,
resume slices). Turning those into Evidence manually is friction; auto-writing
Evidence from an LLM would violate AR-04 and the Reflection confirmation
pattern (ADR-0005).

## Decision

Add **Evidence Extraction Assistant v1**:

1. User submits an artifact (exact text stored, never rewritten).
2. Registered AI Task `evidence.extract` returns structured proposals via the
   Adapter.
3. Deterministic **Proposal Facts** validate/clamp/filter; **Proposal View** is
   presentation only.
4. Each proposal gets a **stable proposal id** within the session.
5. Lifecycle: `proposed → confirmed | declined` only; proposal content is
   immutable after generation.
6. Confirmation writes Evidence **only** through Evidence Service (mastery fold
   + History `evidence_recorded`).
7. **`EVIDENCE_EXTRACTION_VERSION`** is independent of Adapter / Evidence /
   Mastery policy versions.

### Proposal vs Evidence

| | Proposal | Evidence |
|---|----------|----------|
| Authority | Suggestion pending human review | Append-only progress truth (AR-04) |
| Writer | Extraction service (AI-assisted) | Evidence Service only |
| Affects mastery? | No | Yes, via mastery policy fold |

### Proposal lifecycle

Immutable snapshot of proposals after generation. Only `status` may change:
`proposed` → `confirmed` | `declined`. Confirmation references **proposal ids**,
not array indexes. Confirm does **not** re-call the LLM.

### Why confirmation is mandatory

Same rationale as Reflection (ADR-0005): the user is the authority on what
counts as proof. Silent Evidence writes from model output would make progress
non-auditable and non-consensual.

### Why AI confidence is presentation only

`proposalConfidence` helps the founder prioritize review. It must never enter
Evidence rows, mastery weighting, Planning, or Decision ranking.

### Why proposal snapshots are immutable

Auditing “what did the model propose?” requires a frozen record. Revisions mean
a **new** extraction session, not mutating the old proposals.

### Pipeline

```
Artifact → Validated Proposal → Proposal Facts → Proposal View → Review UI
                → (confirm) → Evidence Service → overlay + History
```

## Consequences

- `/evidence/extract` UI + APIs.
- `evidence_extraction_sessions` table; `skill_evidence.generated_from_extraction_id`.
- Allowlisted types V1: `self_report`, `course_completion` with mastery caps.
- OCR, PDF, Mentor, auto-Evidence, batch, ontology authoring deferred.
