# docs/architecture/

## Purpose

Describes how CareerOS is structured as a system — service boundaries, communication patterns, deployment topology, and cross-cutting concerns such as security, observability, and scalability.

## What belongs here

- High-level system diagrams
- Service responsibility maps
- Integration and event-flow documentation
- Infrastructure and deployment architecture
- Security and authentication design
- Scalability and reliability strategies

Architecture documents should be written before service implementation begins.

## What should never be placed here

- Product vision or feature requirements (use `docs/product/`)
- Table-level database design (use `docs/database/`)
- REST/GraphQL endpoint definitions (use `docs/api/`)
- Prompt engineering details (use `docs/ai/` and `prompts/`)
- Visual design or component libraries (use `docs/ui/`)
- Finalized decision rationale in ADR format (use `docs/decisions/`)
