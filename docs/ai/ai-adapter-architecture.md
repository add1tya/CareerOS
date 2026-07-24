# AI Adapter Architecture

Status: Living — Sprint 23 / ADR-0020

## Purpose

Describe how CareerOS calls LLMs safely without letting models own domain state.

## Pipeline

```
AI Task → AI Runtime → AI Provider → Validated Result → Presentation / Evidence
```

| Layer | Responsibility |
|-------|----------------|
| **AI Task** | Zod I/O schemas, prompt id/version, build variable map for substitution |
| **AI Runtime** | Load prompt, call provider, timeout, cancellation, retries (transient only), Zod validation, provenance, metrics |
| **AI Provider** | Transport to a model vendor (Null, Anthropic, Gemini, …) — internal types only; capability-oriented (`structured_completion` today) |
| **Validated Result** | Task DTO that left Runtime |
| **Presentation / Evidence** | UI display, or Evidence gates — never direct Goal/Mastery/History writes |

## Providers

| `AI_PROVIDER` | Key | Notes |
|---------------|-----|--------|
| `null` | — | Offline fixture (default) |
| `anthropic` | `ANTHROPIC_API_KEY` | Optional `ANTHROPIC_MODEL` |
| `gemini` | `GEMINI_API_KEY` | Optional `GEMINI_MODEL` (default `gemini-3.6-flash`) |

See ADR-0020 (adapter), ADR-0021 (Gemini), ADR-0022 (Evidence Extraction),
ADR-0023 (Decision Trace Narrator), ADR-0024 (Resume Intelligence),
ADR-0025 (Career Gap Analysis), ADR-0027 (Capability Registry —
metadata discovery only; never executes consumers), and ADR-0028 (Portfolio
Intelligence — proof-oriented content; distinct from Resume).

## Product consumers (v1)

| Task | Product | Writes domain? |
|------|---------|----------------|
| `adapter.diagnostic` | Smoke test | No |
| `evidence.extract` | Evidence Extraction | Only after confirm → Evidence Service |
| `trace.narrate` | Decision Trace Narrator | Narratives table only |
| `resume.compose` | Resume Intelligence | `resume_drafts` only (append-only) |
| `career.gap_analysis` | Career Gap Analysis | `career_gap_reports` only (append-only) |
| `portfolio.compose` | Portfolio Intelligence | `portfolio_drafts` only (append-only) |

Capability Manifests for these consumers live in the Capability Registry
(ADR-0027) for orchestrator discovery. The registry never executes tasks.

## Prompt loading

Read-only. Loads a file from `prompts/`, verifies version, applies **explicit
`{{variable}}` substitution only**. No dynamic prompt generation.

## Provenance

Every run records an `AiInvocationProvenance` object and appends a row to
`ai_invocations` (immutable: insert + select only). Distinct from History
Event Log and from Reasoning Traces.

## Fail loud

Missing keys (when a live provider is selected), timeouts, transport errors,
and validation failures surface as typed errors. No silent stale domain
fallback (AR-13).

## Non-goals (see ADR-0020)

Mentor Chat, onboarding conversation, template personalization, narrated
traces, chat history, autonomous planning, AI-written recommendations.
