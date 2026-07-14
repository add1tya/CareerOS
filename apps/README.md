# apps/

## Purpose

Contains user-facing applications that deliver the CareerOS experience. Each application is a deployable, independently versioned entry point into the platform.

## What belongs here

- Web application
- Mobile application
- Future client surfaces (e.g., desktop, browser extensions) that serve end users directly

Each app should consume shared logic from `packages/` and communicate with `services/` through documented APIs. Apps own presentation, client-side state, and user interaction — not core business or AI logic.

## What should never be placed here

- Backend APIs, AI pipelines, or background job processors (use `services/`)
- Reusable libraries shared across multiple apps (use `packages/`)
- Database schemas, migrations, or server-side configuration
- Documentation (use `docs/`)
- Prompt templates (use `prompts/`)
- One-off automation or deployment scripts (use `scripts/`)
