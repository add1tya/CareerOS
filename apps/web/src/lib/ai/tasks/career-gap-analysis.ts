/**
 * AI Task: career.gap_analysis (ADR-0025).
 */

import { z } from "zod";

import type { AiTask } from "@/lib/ai/tasks/types";
import {
  GAP_ANALYSIS_VERSION,
  GAP_SECTION_KEYS,
} from "@/lib/gap-analysis/gap-analysis-types";

export const CAREER_GAP_ANALYSIS_TASK_TYPE = "career.gap_analysis";
export const CAREER_GAP_ANALYSIS_PROMPT_ID = "career.gap_analysis";
export const CAREER_GAP_ANALYSIS_PROMPT_VERSION = 1;

export const careerGapSectionSchema = z.object({
  key: z.enum(GAP_SECTION_KEYS),
  prose: z.string().min(1).max(2000),
  citationIds: z.array(z.string().min(1)).min(1).max(24),
});

export const careerGapAnalysisOutputSchema = z.object({
  sections: z.array(careerGapSectionSchema).min(1).max(7),
  uncertaintyNote: z.string().max(500).nullable().optional(),
});

export type CareerGapAnalysisOutput = z.infer<
  typeof careerGapAnalysisOutputSchema
>;

export const careerGapAnalysisInputSchema = z.object({
  gapFactsJson: z.string().min(2),
  gapSectionsJson: z.string().min(2),
  gapAnalysisVersion: z.number().int(),
});

export type CareerGapAnalysisInput = z.infer<
  typeof careerGapAnalysisInputSchema
>;

export const careerGapAnalysisTask: AiTask<
  CareerGapAnalysisInput,
  CareerGapAnalysisOutput
> = {
  taskType: CAREER_GAP_ANALYSIS_TASK_TYPE,
  promptId: CAREER_GAP_ANALYSIS_PROMPT_ID,
  promptVersion: CAREER_GAP_ANALYSIS_PROMPT_VERSION,
  inputSchema: careerGapAnalysisInputSchema,
  outputSchema: careerGapAnalysisOutputSchema,
  buildPromptVariables: (input) => ({
    gap_facts_json: input.gapFactsJson,
    gap_sections_json: input.gapSectionsJson,
    gap_analysis_version: String(input.gapAnalysisVersion),
  }),
};

export function buildCareerGapAnalysisInput(
  gapFactsJson: string,
  gapSectionsJson: string,
): CareerGapAnalysisInput {
  return {
    gapFactsJson,
    gapSectionsJson,
    gapAnalysisVersion: GAP_ANALYSIS_VERSION,
  };
}
