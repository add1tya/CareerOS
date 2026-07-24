/**
 * Resume Intelligence types (ADR-0024).
 *
 * RESUME_INTELLIGENCE_VERSION is independent of AI_ADAPTER_VERSION,
 * prompt versions, and EXPORT_SCHEMA_VERSION.
 */

export const RESUME_INTELLIGENCE_VERSION = 1;

export const RESUME_SECTION_KEYS = [
  "headline",
  "summary",
  "skills",
  "experience",
  "education",
  "currentFocus",
] as const;

export type ResumeSectionKey = (typeof RESUME_SECTION_KEYS)[number];

export type ResumeFactAtom = {
  id: string;
  kind: string;
  label: string;
  value: string;
};

export type ResumeFacts = {
  sufficient: boolean;
  insufficientReason: string | null;
  atoms: ResumeFactAtom[];
  assembledAt: string;
};

/**
 * Deterministic organization of atoms into draft sections.
 * status omit = leave out of draft; unavailable = honest “no verified info”.
 */
export type ResumeSectionPlan = {
  key: ResumeSectionKey;
  status: "include" | "omit" | "unavailable";
  atomIds: string[];
  unavailableMessage: string | null;
};

export type ResumeSections = {
  sections: ResumeSectionPlan[];
};

/** Validated composed draft (after AI + grounding). */
export type ResumeDraftSectionItem = {
  text: string;
  citationIds: string[];
};

export type ResumeDraftSection = {
  key: ResumeSectionKey;
  status: "composed" | "unavailable" | "omitted";
  items: ResumeDraftSectionItem[];
  unavailableMessage: string | null;
};

export type ResumeDraft = {
  resumeIntelligenceVersion: number;
  sections: ResumeDraftSection[];
};

export type ResumeView = {
  status: "ready" | "insufficient" | "missing";
  insufficientReason: string | null;
  facts: ResumeFacts | null;
  sections: ResumeSections | null;
  draft: ResumeDraft | null;
  draftId: string | null;
  createdAt: string | null;
  note: string;
};
