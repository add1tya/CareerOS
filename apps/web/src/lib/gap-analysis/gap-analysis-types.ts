/**
 * Career Gap Analysis types (ADR-0025).
 *
 * GAP_ANALYSIS_VERSION is independent of AI_ADAPTER_VERSION, prompt versions,
 * RESUME_INTELLIGENCE_VERSION, and TRACE_NARRATOR_VERSION.
 */

export const GAP_ANALYSIS_VERSION = 1;

/**
 * Stable section order — owned by the renderer / report builder.
 * AI output is keyed; layout never follows AI array order.
 */
export const GAP_SECTION_KEYS = [
  "overview",
  "strengths",
  "missing",
  "weaknesses",
  "roadmapGaps",
  "confidenceGaps",
  "measurementLimits",
] as const;

export type GapSectionKey = (typeof GAP_SECTION_KEYS)[number];

export type GapFactAtom = {
  id: string;
  /** Distinct categories: missing ≠ weak (ADR-0025). */
  kind:
    | "goal"
    | "progress"
    | "strength"
    | "missing"
    | "weak"
    | "roadmap"
    | "block"
    | "confidence"
    | "focus"
    | "limits";
  label: string;
  value: string;
};

export type GapFacts = {
  sufficient: boolean;
  insufficientReason: string | null;
  atoms: GapFactAtom[];
  assembledAt: string;
  goal: {
    title: string | null;
    status: string | null;
    deadline: string | null;
  };
};

export type GapSectionPlan = {
  key: GapSectionKey;
  status: "include" | "omit" | "unavailable";
  atomIds: string[];
  unavailableMessage: string | null;
};

export type GapSections = {
  sections: GapSectionPlan[];
};

export type GapReportSection = {
  key: GapSectionKey;
  status: "composed" | "unavailable" | "omitted";
  prose: string | null;
  citationIds: string[];
  unavailableMessage: string | null;
};

/** Deterministic metadata persisted with every report. */
export type GapReportMetadata = {
  generatedAt: string;
  goal: {
    title: string | null;
    status: string | null;
    deadline: string | null;
  };
  gapAnalysisVersion: number;
  promptVersion: number;
  adapterVersion: number;
  factsHash: string;
};

export type GapReport = {
  metadata: GapReportMetadata;
  sections: GapReportSection[];
};

export type GapView = {
  status: "ready" | "insufficient" | "missing";
  insufficientReason: string | null;
  facts: GapFacts | null;
  sections: GapSections | null;
  report: GapReport | null;
  reportId: string | null;
  createdAt: string | null;
  note: string;
};
