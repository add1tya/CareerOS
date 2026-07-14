# packages/

## Purpose

Contains shared, versioned libraries used by multiple apps and services. This layer prevents duplication and enforces consistent contracts across the monorepo.

## What belongs here

- Shared TypeScript/JavaScript modules
- Shared types, schemas, and validation logic
- API client SDKs generated from or aligned with `docs/api/`
- Cross-cutting utilities (logging helpers, constants, error types)
- Design tokens or shared UI primitives consumed by apps

Packages should be framework-agnostic where possible and expose stable public APIs.

## What should never be placed here

- Deployable applications (use `apps/`)
- Standalone backend services with their own runtime lifecycle (use `services/`)
- Environment-specific configuration or secrets
- Documentation that describes product intent or system design (use `docs/`)
- AI prompt templates (use `prompts/`)
- Binary assets such as images or fonts (use `assets/`)
