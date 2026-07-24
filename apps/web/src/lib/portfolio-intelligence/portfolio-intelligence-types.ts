/**
 * Portfolio Intelligence types (ADR-0028).
 *
 * PORTFOLIO_INTELLIGENCE_VERSION is independent of RESUME_INTELLIGENCE_VERSION,
 * GAP_ANALYSIS_VERSION, AI_ADAPTER_VERSION, and prompt versions.
 */

export const PORTFOLIO_INTELLIGENCE_VERSION = 1;

/**
 * Stable section order — owned by the renderer / draft builder.
 * AI never determines layout.
 */
export const PORTFOLIO_SECTION_KEYS = [
  "about",
  "featuredProjects",
  "skills",
  "technologies",
  "learningJourney",
  "currentFocus",
  "certifications",
  "achievements",
  "contactPlaceholders",
  "portfolioMetadata",
] as const;

export type PortfolioSectionKey = (typeof PORTFOLIO_SECTION_KEYS)[number];

export type PortfolioFactAtom = {
  id: string;
  kind: string;
  label: string;
  value: string;
};

/**
 * Deterministic featured-project and timeline orders (stable ids).
 * AI must not reorder these lists.
 */
export type PortfolioFacts = {
  sufficient: boolean;
  insufficientReason: string | null;
  atoms: PortfolioFactAtom[];
  assembledAt: string;
  goal: {
    title: string | null;
    status: string | null;
    deadline: string | null;
  };
  /** Count of Evidence rows considered for this assemble. */
  evidenceCount: number;
  /**
   * Stable project ids in featured order (e.g. project.<evidence_uuid>).
   * Empty when no featured projects.
   */
  featuredProjectIds: string[];
  /**
   * Stable timeline event ids in chronological ASC order.
   */
  learningJourneyIds: string[];
};

export type PortfolioSectionPlan = {
  key: PortfolioSectionKey;
  status: "include" | "omit" | "unavailable";
  atomIds: string[];
  unavailableMessage: string | null;
};

export type PortfolioSections = {
  sections: PortfolioSectionPlan[];
};

export type PortfolioDraftSectionItem = {
  text: string;
  citationIds: string[];
  /**
   * Required for featuredProjects / learningJourney items.
   * Must equal the corresponding Portfolio Fact atom id.
   */
  stableId: string | null;
};

export type PortfolioDraftSection = {
  key: PortfolioSectionKey;
  status: "composed" | "unavailable" | "omitted";
  items: PortfolioDraftSectionItem[];
  unavailableMessage: string | null;
};

/** Mandatory deterministic metadata on every draft. */
export type PortfolioDraftMetadata = {
  generatedAt: string;
  goal: {
    title: string | null;
    status: string | null;
    deadline: string | null;
  };
  portfolioIntelligenceVersion: number;
  evidenceCount: number;
  factsHash: string;
};

export type PortfolioDraft = {
  metadata: PortfolioDraftMetadata;
  sections: PortfolioDraftSection[];
};

export type PortfolioView = {
  status: "ready" | "insufficient" | "missing";
  insufficientReason: string | null;
  facts: PortfolioFacts | null;
  sections: PortfolioSections | null;
  draft: PortfolioDraft | null;
  draftId: string | null;
  createdAt: string | null;
  note: string;
};
