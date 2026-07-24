# 0020 — AI Adapter Architecture v1

Status: Accepted
Date: 2026-07-22
Milestone: M23 (Sprint 23 — AI Adapter Architecture v1)

## Context

Sprint 22 closed the deterministic foundation. Phase 2 Adaptive Intelligence
needs a controlled ingress for LLMs before any product feature (Mentor,
personalization, narrated traces) can safely call a model.

Without an adapter boundary, the first AI product sprint would hard-wire a
provider SDK into feature code and risk AI writing into Decision, Planning,
Mastery, History, or Goal state — violating AR-08, AR-10, AR-13, and
Principles 12 / 23 / 29.

## Decision

Add **AI Adapter Architecture v1**: typed AI Tasks, an AI Runtime, provider
abstraction, read-only prompt loading, structured validation, timeouts /
cancellation / retries, and append-only `ai_invocations` provenance.

This sprint is **architectural only**. The sole executable task is
`adapter.diagnostic` (smoke test). No Mentor, onboarding conversation,
template personalization, narrated traces, or AI-owned domain state.

### AI Runtime vs AI Tasks

| | AI Task | AI Runtime |
|---|---------|------------|
| Owns | Schemas, prompt references, input construction | Retries, timeout, cancellation, validation, provenance, metrics |
| May call | Runtime (via adapter service boundary) | Providers (internal) |
| Must not | Retry, validate, or talk to SDKs directly | Invent prompts or own product schemas |

Pipeline: **AI Task → AI Runtime → AI Provider → Validated Result → Presentation / Evidence**.

### AI Runtime vs Providers

Providers are **infrastructure**. They accept internal request shapes and return
raw text/JSON. Provider-specific response types never leave the adapter
subsystem. Only Zod-validated task DTOs exit Runtime.

### AI vs Evidence

AI output must not mutate Mastery or Confidence. Future product sprints may
propose structured claims that become **Evidence** only through deterministic
validation and explicit confirmation gates (AR-04). This sprint never writes
Evidence.

### AI vs History

`ai_invocations` is append-only LLM plumbing provenance (like History’s
immutability stance). It is **not** the Career Graph History Event Log
(ADR-0007). Adapter failures do not emit History events. Career events stay
domain-owned.

### Why AI never owns domain state

Decision Engine ranking, Planning paths, Mastery overlays, Goal rows, and
History indexes are deterministic or Evidence-gated facts. Allowing model
output to write them directly would make recommendations non-reproducible
(AR-08), un-auditable, and fail-silent under API errors (AR-13). Validated
presentation and Evidence gates are the only approved consumption paths.

### Why providers remain infrastructure

Product code depends on **task DTOs**, not Anthropic (or future OpenAI) types.
Swapping providers changes Runtime wiring and env — not Decision/Planning
modules. Domain engines must never import providers, SDKs, or AI Runtime.

### Versioning

- **`AI_ADAPTER_VERSION`** — adapter shell / Runtime contract (independent).
- **Prompt file versions** — per-template in `prompts/` (independent).
- Domain schema / Planning / Explorer versions remain unrelated.

### Domain isolation

Decision Engine, Planning Engine, mastery writers, and History writers must
not import `@/lib/ai` providers, SDKs, or Runtime. Only approved AI Tasks
(invoked through the adapter service / API) may call Runtime.

## Consequences

- Dashboard shows Adapter Status + diagnostic.
- `@anthropic-ai/sdk` is a server dependency; NullProvider covers no-key CI.
- Prompts are version-checked via a registered catalog
  (`registered-prompts.ts`) with markdown review copies under `prompts/` and
  `apps/web/prompts/`. Loader remains read-only aside from `{{variable}}`
  substitution.
- Append-only `ai_invocations` with RLS; no update/delete policies.
- Mentor, chat_messages, personalization, narrated traces, and autonomous
  planning remain deferred.

### Divergences / deferred (deliberate, not silent)

- Roadmap Phase 6 product AI features (items 3–10) deferred.
- `packages/ai` workspace extract deferred until a second consumer exists
  (Principle 7); code lives under `apps/web/src/lib/ai/`.
- Streaming deferred.
- AI-written recommendations and AI-owned state permanently out of scope for
  this architecture (not merely deferred).
