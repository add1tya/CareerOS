/**
 * Portfolio View — presentation projection (ADR-0028).
 */

import type {
  PortfolioDraft,
  PortfolioFacts,
  PortfolioSections,
  PortfolioView,
} from "@/lib/portfolio-intelligence/portfolio-intelligence-types";

export function buildPortfolioView(args: {
  status: PortfolioView["status"];
  insufficientReason?: string | null;
  facts?: PortfolioFacts | null;
  sections?: PortfolioSections | null;
  draft?: PortfolioDraft | null;
  draftId?: string | null;
  createdAt?: string | null;
}): PortfolioView {
  return {
    status: args.status,
    insufficientReason: args.insufficientReason ?? null,
    facts: args.facts ?? null,
    sections: args.sections ?? null,
    draft: args.draft ?? null,
    draftId: args.draftId ?? null,
    createdAt: args.createdAt ?? null,
    note:
      "Portfolio Intelligence composes proof-oriented content from CareerOS facts. It is not Resume Intelligence and does not own websites or publishing.",
  };
}
