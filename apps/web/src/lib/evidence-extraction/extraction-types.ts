/**
 * Evidence Extraction types (ADR-0022).
 *
 * EVIDENCE_EXTRACTION_VERSION is independent of AI_ADAPTER_VERSION,
 * mastery policy, and Evidence taxonomy revisions.
 */

export const EVIDENCE_EXTRACTION_VERSION = 1;

export const EXTRACTION_STATUSES = ["proposed", "confirmed", "declined"] as const;
export type ExtractionStatus = (typeof EXTRACTION_STATUSES)[number];

/** V1 allowlisted Evidence types for AI proposals. */
export const EXTRACTION_EVIDENCE_TYPES = [
  "self_report",
  "course_completion",
] as const;
export type ExtractionEvidenceType = (typeof EXTRACTION_EVIDENCE_TYPES)[number];

export const PROPOSAL_CONFIDENCE_LEVELS = ["low", "medium", "high"] as const;
export type ProposalConfidence = (typeof PROPOSAL_CONFIDENCE_LEVELS)[number];

/** Hard caps — never trust the model for unbounded mastery claims. */
export const IMPLIED_MASTERY_CAPS: Record<ExtractionEvidenceType, number> = {
  self_report: 0.5,
  course_completion: 0.55,
};

export const MAX_ARTIFACT_CHARS = 12_000;
export const MAX_PROPOSALS = 5;

/**
 * Immutable proposal fact stored on the session (after deterministic validation).
 * proposalConfidence is presentation-only — never written to Evidence.
 */
export type ProposalFact = {
  proposalId: string;
  skillKey: string;
  evidenceType: ExtractionEvidenceType;
  impliedMastery: number;
  summary: string;
  quoteSpan: string | null;
  /** Presentation only — never affects mastery / Evidence / planning / decision. */
  proposalConfidence: ProposalConfidence;
};

export type AcceptedProposalRef = {
  proposalId: string;
  /** Optional user tweak; clamped again at confirm. */
  impliedMastery?: number;
};

export type ExtractionSession = {
  id: string;
  userId: string;
  artifactText: string;
  artifactByteLength: number;
  proposals: ProposalFact[];
  accepted: AcceptedProposalRef[] | null;
  status: ExtractionStatus;
  aiInvocationId: string | null;
  extractionVersion: number;
  promptId: string;
  promptVersion: number;
  adapterVersion: number;
  createdAt: string;
  resolvedAt: string | null;
};
