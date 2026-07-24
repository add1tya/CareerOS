# 0028 — Portfolio Intelligence v1

Status: Accepted
Date: 2026-07-25
Milestone: M33 (Sprint 33 — Portfolio Intelligence v1)

## Context

Resume Intelligence (ADR-0024) produces a hiring document. Founders also need a
**proof-oriented technical portfolio** grounded in verified Evidence, skills, and
learning chronology — without inventing projects, metrics, or certifications.

Sprint 33 adds Adapter consumer `portfolio.compose`.

## Decision

Add **Portfolio Intelligence v1**:

1. Pipeline: **Career Graph → Portfolio Facts → Portfolio Sections → Portfolio
   Draft → Portfolio View → UI** (+ deterministic Markdown/HTML export).
2. Portfolio Facts are citeable atoms. **Featured project order** and **Learning
   Journey chronology** are fixed in Facts/Sections — the AI never chooses or
   reorders them.
3. Every project atom has a **stable id** (`project.<evidence_id>`); consumers
   must not depend on titles.
4. AI Task `portfolio.compose` rewrites presentation only; citations required.
5. Drafts are **append-only** (`portfolio_drafts`) with mandatory metadata
   (generated_at, goal, version, evidence count, facts hash).
6. **`PORTFOLIO_INTELLIGENCE_VERSION`** is independent of Resume, Gap, Adapter,
   and prompt versions.
7. Portfolio owns **content only** — not websites, themes, publishing, branding,
   or hosting.

### Portfolio vs Resume

| | Resume Intelligence | Portfolio Intelligence |
|---|---------------------|------------------------|
| Purpose | Hiring document | Technical proof document |
| Bias | Summary / employability | Projects / evidence / journey |

### Facts vs Sections

| | Portfolio Facts | Portfolio Sections |
|---|-----------------|-------------------|
| Role | Atoms + deterministic project/timeline order | include / omit / unavailable |
| LLM? | No | No |

### Portfolio content vs Website

Portfolio drafts are content snapshots. Website generation, themes, hosting, and
publishing are **downstream consumers** — out of scope.

### Why featured projects are deterministic

Letting the model pick “highlights” invents editorial ranking. CareerOS Evidence
timestamps and tier rules already define order.

### Why AI never changes chronology or verification status

Reordering timeline events or promoting unverified self-reports to featured
projects would falsify the learning record. Validation rejects order/stableId
mismatches.

### Why exports are deterministic renderers

Markdown and HTML are serializers of the validated DTO — no second LLM pass —
so export cannot invent content the draft does not contain.

## Consequences

- `/portfolio` UI with facts, section plan, compose, citations, prior drafts.
- Table `portfolio_drafts` + Capability Registry manifest.
- Website hosting, GitHub sync, themes, analytics deferred.
