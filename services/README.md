# services/

## Purpose

Contains independently deployable backend services that power CareerOS. Services own server-side logic, data access, AI orchestration, and asynchronous processing.

## What belongs here

- Backend API
- AI Engine
- Background Scheduler
- Future backend services (e.g., notification delivery, analytics ingestion) that run as separate processes or containers

Each service should expose clear boundaries, communicate through documented contracts, and depend on shared code in `packages/` where appropriate.

## What should never be placed here

- User-facing UI or mobile client code (use `apps/`)
- Generic libraries intended for reuse across apps and services (use `packages/`)
- Product or architecture documentation (use `docs/`)
- Prompt content and prompt versioning artifacts (use `prompts/`)
- Static media assets (use `assets/`)
- Repository-wide automation scripts (use `scripts/`)
