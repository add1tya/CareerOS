# .github/

## Purpose

Hosts GitHub-specific configuration for repository governance, collaboration, and continuous integration/deployment.

## What belongs here

- GitHub Actions workflow definitions
- Pull request and issue templates
- CODEOWNERS and branch protection-related configuration
- Dependabot or similar automated dependency update configs
- GitHub-specific contribution guidelines that supplement root-level docs

## What should never be placed here

- Application or service source code (use `apps/`, `services/`)
- Product documentation (use `docs/`)
- Local-only developer scripts not intended for CI (use `scripts/`)
- AI prompt templates (use `prompts/`)
- Static brand assets (use `assets/`)
- Secrets, tokens, or credentials of any kind
