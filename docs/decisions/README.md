# docs/decisions/

## Purpose

Records significant engineering and product decisions as Architecture Decision Records (ADRs). Each record captures context, the decision made, and its consequences so future contributors understand why the system is shaped the way it is.

## What belongs here

- ADRs for technology choices (frameworks, databases, hosting)
- ADRs for architectural patterns (monorepo structure, service boundaries)
- ADRs for AI-related trade-offs (model selection, evaluation approach)
- ADRs for security, privacy, and compliance choices
- Superseded decisions with clear migration notes

Use a consistent naming convention such as `0001-record-title.md`.

## What should never be placed here

- Living product documentation that changes frequently (use `docs/product/`)
- Current-state architecture diagrams (use `docs/architecture/`)
- Active schema definitions (use `docs/database/`)
- API specifications (use `docs/api/`)
- Prompt templates (use `prompts/`)
- Source code or configuration files
