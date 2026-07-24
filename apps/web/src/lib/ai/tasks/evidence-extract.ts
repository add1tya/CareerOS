/**
 * AI Task: evidence.extract (ADR-0022).
 * Schemas + prompt refs only — no provider / Evidence writes.
 */

import { z } from "zod";

import type { AiTask } from "@/lib/ai/tasks/types";
import {
  EXTRACTION_EVIDENCE_TYPES,
  EVIDENCE_EXTRACTION_VERSION,
  PROPOSAL_CONFIDENCE_LEVELS,
} from "@/lib/evidence-extraction/extraction-types";

export const EVIDENCE_EXTRACT_TASK_TYPE = "evidence.extract";
export const EVIDENCE_EXTRACT_PROMPT_ID = "evidence.extract";
export const EVIDENCE_EXTRACT_PROMPT_VERSION = 1;

/** Raw model output — ids assigned later by Proposal Facts builder. */
export const evidenceExtractRawProposalSchema = z.object({
  skillKey: z.string().min(1),
  evidenceType: z.enum(EXTRACTION_EVIDENCE_TYPES),
  impliedMastery: z.number().min(0).max(1),
  summary: z.string().min(1).max(500),
  quoteSpan: z.string().max(400).nullable().optional(),
  proposalConfidence: z.enum(PROPOSAL_CONFIDENCE_LEVELS),
});

export const evidenceExtractOutputSchema = z.object({
  proposals: z.array(evidenceExtractRawProposalSchema).max(8),
  overallNotes: z.string().max(1000).nullable().optional(),
});

export type EvidenceExtractOutput = z.infer<typeof evidenceExtractOutputSchema>;

export const evidenceExtractInputSchema = z.object({
  artifactText: z.string().min(1),
  allowedSkillKeysJson: z.string().min(2),
  extractionVersion: z.number().int(),
});

export type EvidenceExtractInput = z.infer<typeof evidenceExtractInputSchema>;

export const evidenceExtractTask: AiTask<
  EvidenceExtractInput,
  EvidenceExtractOutput
> = {
  taskType: EVIDENCE_EXTRACT_TASK_TYPE,
  promptId: EVIDENCE_EXTRACT_PROMPT_ID,
  promptVersion: EVIDENCE_EXTRACT_PROMPT_VERSION,
  inputSchema: evidenceExtractInputSchema,
  outputSchema: evidenceExtractOutputSchema,
  buildPromptVariables: (input) => ({
    artifact_text: input.artifactText,
    allowed_skill_keys_json: input.allowedSkillKeysJson,
    extraction_version: String(input.extractionVersion),
  }),
};

export function buildEvidenceExtractInput(
  artifactText: string,
  allowedSkillKeys: string[],
): EvidenceExtractInput {
  return {
    artifactText,
    allowedSkillKeysJson: JSON.stringify(allowedSkillKeys),
    extractionVersion: EVIDENCE_EXTRACTION_VERSION,
  };
}
