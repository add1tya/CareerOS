# 0025 — Career Gap Analysis v1

Status: Accepted
Date: 2026-07-24
Milestone: M27 (Sprint 27 — Career Gap Analysis v1)

## Context

CareerOS already exposes Goal Progress Explainability (where on the path),
Decision Explainability (why this recommendation), and Resume Intelligence
(grounded prose for employers). Founders still need a cross-cutting honesty
report: verified strengths, missing evidence, and weak mastery — without
letting AI invent a plan.

Sprint 27 adds the fourth AI Adapter product consumer: `career.gap_analysis`.

## Decision

Add **Career Gap Analysis v1**:

1. Pipeline: **Career Graph → Gap Facts → Gap Sections → Gap Report → Gap View → UI**.
2. Gap Facts are citeable atoms. **Missing** (no verified evidence) and **Weak**
   (verified evidence but low mastery) are **separate categories** — never merged.
3. Gap Sections deterministically organize atoms (include / omit / unavailable).
4. AI Task `career.gap_analysis` summarizes current state in present tense with
   **section provenance** (citation ids). The **renderer** owns section order.
5. Reports are **append-only** (`career_gap_reports`) with deterministic metadata
   (generated_at, goal, versions, facts hash). Never write back to Career Graph /
   Evidence / Mastery / Goals / Planning / Recommendations.
6. **`GAP_ANALYSIS_VERSION`** is independent of Adapter, prompts, Resume
   Intelligence, and Trace Narrator.

### Facts vs Sections

| | Gap Facts | Gap Sections |
|---|-----------|--------------|
| Role | Atomic CareerOS truths | Deterministic organization for reporting |
| LLM? | No | No |

### Sections vs Report

| | Gap Sections | Gap Report |
|---|--------------|------------|
| Role | Plan of what may be narrated | Validated grounded prose + citations + metadata |
| Layout | Keys only | Renderer orders by stable `GAP_SECTION_KEYS` |

### Gap Analysis vs Goal Progress

| | Goal Progress Explainability (ADR-0016) | Gap Analysis (this ADR) |
|---|----------------------------------------|-------------------------|
| Focus | Roadmap stage + path lists | Strengths / missing / weak / path gaps in prose |
| LLM? | No | Summarization only |

### Gap Analysis vs Planning

Planning owns roadmap order and recommendations. Gap Analysis **never**:
recommends alternate roadmaps, reprioritizes skills, generates learning plans,
or estimates completion.

### Why AI summarizes but never predicts

The model rephrases current facts. Predictions, ETAs, and future guarantees would
invent Risk/Prediction Engine claims CareerOS does not yet own honestly.

### Why every section must be grounded

Ungrounded gap prose invents deficits or strengths. Citations to Gap Fact atoms
make invention fail validation.

## Consequences

- `/gap-analysis` UI: facts always visible + generate button.
- Table `career_gap_reports` + `ai_invocations` provenance.
- Mentor, forecasting, employability, market demand, salary, planning advice,
  and risk prediction remain deferred.
