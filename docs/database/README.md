# docs/database/

## Purpose

Documents the data layer of CareerOS — what is persisted, how entities relate, and the rationale behind storage decisions.

## What belongs here

- Entity-relationship diagrams
- Schema definitions and field descriptions
- Migration strategy and versioning approach
- Indexing, partitioning, and performance considerations
- Data retention and privacy policies

Database design should follow product requirements and precede API and service implementation.

## What should never be placed here

- Product vision or user-facing feature specs (use `docs/product/`)
- Service-level architecture (use `docs/architecture/`)
- HTTP API contracts (use `docs/api/`)
- AI model or embedding storage specifics unrelated to core data design (use `docs/ai/`)
- UI data-fetching patterns (use `docs/ui/`)
- Architecture Decision Records (use `docs/decisions/`)
