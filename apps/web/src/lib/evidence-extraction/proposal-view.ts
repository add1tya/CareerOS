/**
 * Proposal View — presentation projection (ADR-0022).
 * Does not validate, mutate proposals, or write Evidence.
 */

import type {
  ExtractionSession,
  ProposalFact,
} from "@/lib/evidence-extraction/extraction-types";

export type ProposalViewItem = {
  proposalId: string;
  skillKey: string;
  skillName: string;
  evidenceType: ProposalFact["evidenceType"];
  impliedMastery: number;
  summary: string;
  quoteSpan: string | null;
  /** Presentation only. */
  proposalConfidence: ProposalFact["proposalConfidence"];
};

export type ExtractionProposalView = {
  sessionId: string;
  status: ExtractionSession["status"];
  artifactText: string;
  artifactByteLength: number;
  proposals: ProposalViewItem[];
  overallNotes: string | null;
  extractionVersion: number;
  createdAt: string;
  note: string;
};

export function buildExtractionProposalView(args: {
  session: ExtractionSession;
  skillNames: Map<string, string>;
  overallNotes?: string | null;
}): ExtractionProposalView {
  const { session, skillNames, overallNotes = null } = args;

  return {
    sessionId: session.id,
    status: session.status,
    artifactText: session.artifactText,
    artifactByteLength: session.artifactByteLength,
    proposals: session.proposals.map((p) => ({
      proposalId: p.proposalId,
      skillKey: p.skillKey,
      skillName: skillNames.get(p.skillKey) ?? p.skillKey,
      evidenceType: p.evidenceType,
      impliedMastery: p.impliedMastery,
      summary: p.summary,
      quoteSpan: p.quoteSpan,
      proposalConfidence: p.proposalConfidence,
    })),
    overallNotes,
    extractionVersion: session.extractionVersion,
    createdAt: session.createdAt,
    note:
      "Proposals are suggestions only. Confirming writes Evidence through the Evidence Service. Proposal confidence never affects mastery.",
  };
}
