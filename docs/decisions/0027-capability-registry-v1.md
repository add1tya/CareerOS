# 0027 — Capability Registry & Tool Discovery v1

Status: Accepted
Date: 2026-07-24
Milestone: M29 (Sprint 29 — Capability Registry & Tool Discovery v1)

## Context

CareerOS has multiple Adapter consumers (Evidence Extraction, Trace Narrator,
Resume Intelligence, Gap Analysis). Orchestrators such as Career Copilot need a
single, deterministic place to discover *what exists* without hard-coding
private lists or embedding execution.

## Decision

Add **Capability Registry & Tool Discovery v1**:

1. Each capability publishes a **Capability Manifest** (Zod-validated metadata).
2. The **Registry** indexes manifests: register, get, list — **never executes**.
3. Discovery API exposes manifests to authenticated clients.
4. Capability **`id` is immutable**; `displayName` is presentation only.
5. Manifests declare optional **dependencies** as metadata only — the registry
   never resolves or runs them.
6. List responses use **deterministic ordering** (by `id`), never module init order.
7. **`CAPABILITY_REGISTRY_VERSION`** and **`CAPABILITY_MANIFEST_SCHEMA_VERSION`**
   are independent of Adapter and per-capability product versions.
8. Manifests are **code-owned** (no plugin DB in v1).

### Manifest vs Registry

| | Manifest | Registry |
|---|----------|----------|
| Role | Self-description of one capability | Catalog index + discovery |
| Executes? | No | No |

### Registry vs Orchestrator

| | Registry | Orchestrator (e.g. Copilot) |
|---|----------|-----------------------------|
| Role | What can be discovered | When/how to invoke |
| Owns | Metadata | Intent routing + execution calls |

### Metadata vs Execution

Execution always belongs to the capability implementation. The registry must
never duplicate business logic or call domain services to “run” a tool.

### Stable capability identity

Internal references use immutable `id`. Renaming UX copy only changes
`displayName`.

### Why manifests are code-owned

Definitions ship with the monorepo alongside the capability. A DB plugin loader
would add mutability and trust surface before Copilot needs it.

### Why the registry never executes

If the registry ran tools, it would become a second orchestration layer and risk
AI-owned or duplicated domain paths. Discovery stays dumb; implementations stay
authoritative.

## Consequences

- `GET /api/capabilities` (+ optional `/capabilities` UI).
- Four built-in Adapter-consumer manifests registered at bootstrap.
- Copilot execution, MCP export, and dynamic plugins remain deferred.
