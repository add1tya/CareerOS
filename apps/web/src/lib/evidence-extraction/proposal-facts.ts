/**
 * Proposal Facts — deterministic validation after AI output (ADR-0022).
 *
 * Assigns stable proposal ids, clamps mastery, filters unknown skills,
 * enforces allowlist + max count. Confidence remains presentation-only.
 */

import { randomUUID } from "node:crypto";

import type { EvidenceExtractOutput } from "@/lib/ai/tasks/evidence-extract";
import {
  IMPLIED_MASTERY_CAPS,
  MAX_PROPOSALS,
  type ProposalFact,
} from "@/lib/evidence-extraction/extraction-types";

export type BuildProposalFactsResult = {
  proposals: ProposalFact[];
  droppedCount: number;
  overallNotes: string | null;
};

export function buildProposalFacts(
  raw: EvidenceExtractOutput,
  allowedSkillKeys: ReadonlySet<string>,
): BuildProposalFactsResult {
  const proposals: ProposalFact[] = [];
  let droppedCount = 0;

  for (const item of raw.proposals) {
    if (proposals.length >= MAX_PROPOSALS) {
      droppedCount += 1;
      continue;
    }
    if (!allowedSkillKeys.has(item.skillKey)) {
      droppedCount += 1;
      continue;
    }

    const cap = IMPLIED_MASTERY_CAPS[item.evidenceType];
    const impliedMastery = clamp(item.impliedMastery, 0, cap);

    proposals.push({
      proposalId: randomUUID(),
      skillKey: item.skillKey,
      evidenceType: item.evidenceType,
      impliedMastery,
      summary: item.summary.trim(),
      quoteSpan: item.quoteSpan?.trim() ? item.quoteSpan.trim() : null,
      proposalConfidence: item.proposalConfidence,
    });
  }

  return {
    proposals,
    droppedCount,
    overallNotes: raw.overallNotes?.trim() ? raw.overallNotes.trim() : null,
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
