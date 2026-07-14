# docs/

## Purpose

Central documentation hub for CareerOS. Documentation precedes implementation — no feature should be built without first being documented here.

## What belongs here

Organized documentation across the following areas:

| Directory | Scope |
|-----------|-------|
| `product/` | Vision, philosophy, principles, and product language |
| `architecture/` | System design, service boundaries, and integration patterns |
| `database/` | Data models, schemas, and persistence decisions |
| `api/` | API contracts, endpoints, and integration specifications |
| `ai/` | AI system design, model usage, and orchestration concepts |
| `ui/` | Design system, interaction patterns, and client experience guidelines |
| `decisions/` | Architecture Decision Records (ADRs) |

## What should never be placed here

- Application source code (use `apps/`, `services/`, or `packages/`)
- Executable scripts or build tooling (use `scripts/`)
- Prompt templates used at runtime (use `prompts/`)
- Binary or media files (use `assets/`)
- Auto-generated artifacts that belong alongside the code that produces them
