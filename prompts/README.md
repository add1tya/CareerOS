# prompts/

## Purpose

Stores versioned AI prompt templates used at runtime by the AI Engine and related services. Separating prompts from application code enables independent iteration, testing, and auditability.

**Runtime note (ADR-0020):** Next loads prompts from `apps/web/src/lib/ai/registered-prompts.ts` (version-checked, read-only). Keep markdown review copies here and under `apps/web/prompts/` in sync when editing.

## What belongs here

- System prompts, user prompt templates, and few-shot examples
- Prompt variants organized by feature or capability
- Prompt changelog or version metadata (as documentation alongside templates)
- Evaluation fixtures tied to specific prompt versions

Prompt design rationale and orchestration logic belong in `docs/ai/`.

## What should never be placed here

- Application or service source code (use `apps/`, `services/`)
- Product requirements or vision documents (use `docs/product/`)
- API specifications (use `docs/api/`)
- Database schemas (use `docs/database/`)
- UI copy unrelated to AI interactions (use `docs/ui/` or app localization)
- Deployment or CI scripts (use `scripts/` or `.github/`)
