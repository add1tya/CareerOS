/**
 * Decision Trace Narrator types (ADR-0023).
 *
 * TRACE_NARRATOR_VERSION is independent of DECISION_EXPLANATION_VERSION,
 * AI_ADAPTER_VERSION, and prompt file versions.
 */

export const TRACE_NARRATOR_VERSION = 1;

export const NARRATIVE_SECTION_KEYS = [
  "overview",
  "whyThisSkill",
  "whyNow",
  "whyNotRunnerUp",
  "ifSkipped",
  "goalAlignment",
] as const;

export type NarrativeSectionKey = (typeof NARRATIVE_SECTION_KEYS)[number];

/** One citeable atom from the deterministic Trace Facts layer. */
export type TraceFactAtom = {
  id: string;
  label: string;
  value: string;
};

/**
 * Deterministic assembly of the Decision Trace for narration.
 * If sufficient=false, AI must not be invoked.
 */
export type TraceFacts = {
  sufficient: boolean;
  insufficientReason: string | null;
  recommendationId: string;
  winnerSkillKey: string | null;
  winnerName: string | null;
  runnerUpSkillKey: string | null;
  runnerUpName: string | null;
  decidingFactorId: string | null;
  confidence: string | null;
  goalTitle: string | null;
  decisionExplanationVersion: number | null;
  atoms: TraceFactAtom[];
  /** Deterministic section strings from Explainability (source of truth for grounding). */
  sourceSections: {
    whyThisSkill: string;
    whyNow: string;
    whyNotOther: string;
    ifSkipped: string;
    goalAlignment: string;
  } | null;
};

/** Validated narrative after grounding (Narrative Facts). */
export type NarrativeSectionFact = {
  key: NarrativeSectionKey;
  prose: string;
  /** Trace Fact atom ids that support this section. */
  citationIds: string[];
};

export type NarrativeFacts = {
  traceNarratorVersion: number;
  decisionExplanationVersion: number;
  sections: NarrativeSectionFact[];
  uncertaintyNote: string | null;
};

export type NarrativeView = {
  recommendationId: string;
  status: "ready" | "insufficient" | "missing";
  insufficientReason: string | null;
  narrative: NarrativeFacts | null;
  /** Presentation note — never hides structured explanation. */
  note: string;
  createdAt: string | null;
};
