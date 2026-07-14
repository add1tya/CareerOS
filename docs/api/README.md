# docs/api/

## Purpose

Defines the contracts through which apps, services, and external integrations communicate. APIs are specified here before implementation in `services/`.

## What belongs here

- REST, GraphQL, or RPC endpoint specifications
- Request and response schemas
- Authentication and authorization requirements per endpoint
- Error codes and handling conventions
- Versioning and deprecation policies
- Webhook and event payload definitions

## What should never be placed here

- Product requirements or user stories (use `docs/product/`)
- Infrastructure or deployment diagrams (use `docs/architecture/`)
- Database table definitions (use `docs/database/`)
- LLM prompt templates (use `prompts/`)
- UI component behavior (use `docs/ui/`)
- ADRs explaining why a protocol or pattern was chosen (use `docs/decisions/`)
