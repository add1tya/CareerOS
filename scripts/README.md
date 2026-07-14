# scripts/

## Purpose

Houses repository-level automation scripts that support development, operations, and maintenance workflows across the monorepo.

## What belongs here

- Local development setup and bootstrap scripts
- Code generation utilities (e.g., SDK generation from API specs)
- Database seeding or migration helpers invoked during development
- One-off maintenance and data-migration scripts
- Repository health checks and lint orchestration wrappers

Scripts here are for developer and operator use — not for production runtime execution inside services.

## What should never be placed here

- Application or service business logic (use `apps/`, `services/`)
- Reusable libraries consumed by apps or services (use `packages/`)
- CI/CD workflow definitions (use `.github/`)
- Product or architecture documentation (use `docs/`)
- AI prompt templates (use `prompts/`)
- Static assets (use `assets/`)
