# Prompt changelog

## 2026-07-25 — portfolio.compose v1

- Added `portfolio.compose` v1 for Portfolio Intelligence (ADR-0028).
- Proof-oriented portfolio; featured/timeline order fixed; citations + stableId required.
- Distinct from Resume Intelligence. Content only — not websites/publishing.
- Runtime: `registered-prompts.ts`. Review copies under `prompts/` and `apps/web/prompts/`.

## 2026-07-24 — career.gap_analysis v1

- Added `career.gap_analysis` v1 for Career Gap Analysis (ADR-0025).
- Present-tense summary of Gap Facts; Missing ≠ Weak; never plans or predicts.
- Runtime: `registered-prompts.ts`. Review copies under `prompts/` and `apps/web/prompts/`.

## 2026-07-24 — resume.compose v1

- Added `resume.compose` v1 for Resume Intelligence (ADR-0024).
- Composes grounded resume prose from Resume Facts / Sections; citations required.
- Distinct from Export (serialization). Never invents employers or credentials.
- Runtime: `registered-prompts.ts`. Review copies under `prompts/` and `apps/web/prompts/`.

## 2026-07-22 — trace.narrate v1

- Added `trace.narrate` v1 for Decision Trace Narrator (ADR-0023).
- Prose only; grounded citations required; never re-ranks.

## 2026-07-22 — evidence.extract v1

- Added `evidence.extract` v1 for Evidence Extraction Assistant (ADR-0022).
- Proposals only; confirmation required before Evidence write.
- Runtime: `registered-prompts.ts`. Review copies under `prompts/` and `apps/web/prompts/`.

## 2026-07-22 — adapter.diagnostic v1

- Added `adapter.diagnostic` v1 for AI Adapter Architecture smoke test (ADR-0020).
- Not a product prompt; verifies Task → Runtime → Provider → validation only.
- Runtime: registered in `apps/web/src/lib/ai/registered-prompts.ts` (Next-safe).
- Review copies: `apps/web/prompts/` and repo-root `prompts/` (keep in sync).
