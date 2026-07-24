# 0021 — Gemini provider for AI Adapter

Status: Accepted
Date: 2026-07-22
Milestone: M23b (Gemini provider — AI Adapter infrastructure)

## Context

ADR-0020 introduced the AI Adapter with `NullProvider` and `AnthropicProvider`.
Operators selecting `AI_PROVIDER=gemini` received `unknown_provider`. Gemini
must be a first-class transport without touching Decision, Planning, Mastery,
History, or Goal engines.

## Decision

1. Add **`GeminiProvider`** implementing the same `AiProvider` capability
   surface (`structured_completion`) via the official `@google/genai` SDK.
2. Extend the env factory to accept **`null | anthropic | gemini`**.
3. Evolve `AiProvider` to be **capability-oriented** (`capabilities` set) so
   future chat / embeddings / tools / streaming can be added without forcing a
   single `chat()` redesign.
4. Share abort / HTTP / quota error mapping in `provider-errors.ts`.
5. Keep append-only `ai_invocations` provenance provider-agnostic (same fields).

### Defaults

- Model: `gemini-3.6-flash` (override with `GEMINI_MODEL`; prefer current stable
  Flash ids — `gemini-2.5-flash` returns 404 on many keys after mid-2026)
- Key: `GEMINI_API_KEY`
- Timeout: Runtime `AbortSignal` + optional `AI_ADAPTER_TIMEOUT_MS` as Gemini
  `httpOptions.timeout`

## Consequences

- Diagnostics show Provider `gemini` when configured.
- Domain engines remain unaware of the active vendor.
- Mentor / personalization / narrated traces still deferred.

### Deferred

- Additional capabilities beyond structured completion
- OpenAI / OpenRouter / Ollama / Bedrock providers
- Streaming
