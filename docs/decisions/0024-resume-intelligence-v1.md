# 0024 — Resume Intelligence v1

Status: Accepted
Date: 2026-07-24
Milestone: M26 (Sprint 26 — Resume Intelligence v1)

## Context

CareerOS holds a live Career Graph (skills, evidence, goals). Founders need
resume-ready prose without inventing employers, degrees, or metrics. Export
(ADR-0008) already serializes ownership data; it does not compose professional
copy.

Sprint 26 adds the third AI Adapter product consumer: `resume.compose`.

## Decision

Add **Resume Intelligence v1**:

1. Pipeline: **Career Graph → Resume Facts → Resume Sections → Resume View → UI**.
2. Resume Facts are citeable atoms from persisted CareerOS reads.
3. Resume Sections **deterministically organize** atoms (omit or mark unavailable
   when empty — never imply missing experience).
4. AI Task `resume.compose` produces grounded prose with **section provenance**
   (citation ids).
5. Drafts are **append-only** (`resume_drafts`); never mutate; never write back
   to Career Graph / Evidence / Mastery / Goals / Planning / Recommendations.
6. **`RESUME_INTELLIGENCE_VERSION`** is independent of Adapter, prompts, and
   Export schema.

### Facts vs Sections

| | Resume Facts | Resume Sections |
|---|--------------|-----------------|
| Role | Atomic CareerOS truths | Deterministic organization for drafting |
| LLM? | No | No |

### Sections vs View

| | Resume Sections / Draft | Resume View |
|---|-------------------------|-------------|
| Role | Structured grounded content | Presentation for UI / copy |

### Resume Intelligence vs Export

| | Export (ADR-0008) | Resume Intelligence (this ADR) |
|---|-------------------|--------------------------------|
| Purpose | Serialize CareerOS for ownership | Compose CareerOS into professional prose |
| Artifact | Markdown/JSON dump | Immutable draft DTO |
| Invent? | Never | Never — citations required |

These remain **separate products**.

### Why AI composes rather than invents

The model may rephrase and structure; it may not add employers, dates, degrees,
or skills absent from Resume Facts. Every generated sentence must cite atoms.

### Why every sentence must be grounded

Ungrounded resume prose recreates the failure mode CareerOS avoids elsewhere:
plausible fiction. Citations make invention fail validation.

## Consequences

- `/resume` UI with facts always visible + compose button.
- Table `resume_drafts` + `ai_invocations` provenance.
- ATS, LinkedIn, PDF layout, mentor editing deferred.
