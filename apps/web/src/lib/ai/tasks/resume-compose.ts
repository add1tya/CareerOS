/**
 * AI Task: resume.compose (ADR-0024).
 */

import { z } from "zod";

import type { AiTask } from "@/lib/ai/tasks/types";
import {
  RESUME_INTELLIGENCE_VERSION,
  RESUME_SECTION_KEYS,
} from "@/lib/resume-intelligence/resume-intelligence-types";

export const RESUME_COMPOSE_TASK_TYPE = "resume.compose";
export const RESUME_COMPOSE_PROMPT_ID = "resume.compose";
export const RESUME_COMPOSE_PROMPT_VERSION = 1;

export const resumeComposeItemSchema = z.object({
  text: z.string().min(1).max(800),
  citationIds: z.array(z.string().min(1)).min(1).max(20),
});

export const resumeComposeSectionSchema = z.object({
  key: z.enum(RESUME_SECTION_KEYS),
  items: z.array(resumeComposeItemSchema).max(12),
});

export const resumeComposeOutputSchema = z.object({
  sections: z.array(resumeComposeSectionSchema).min(1).max(6),
});

export type ResumeComposeOutput = z.infer<typeof resumeComposeOutputSchema>;

export const resumeComposeInputSchema = z.object({
  resumeFactsJson: z.string().min(2),
  resumeSectionsJson: z.string().min(2),
  resumeIntelligenceVersion: z.number().int(),
});

export type ResumeComposeInput = z.infer<typeof resumeComposeInputSchema>;

export const resumeComposeTask: AiTask<
  ResumeComposeInput,
  ResumeComposeOutput
> = {
  taskType: RESUME_COMPOSE_TASK_TYPE,
  promptId: RESUME_COMPOSE_PROMPT_ID,
  promptVersion: RESUME_COMPOSE_PROMPT_VERSION,
  inputSchema: resumeComposeInputSchema,
  outputSchema: resumeComposeOutputSchema,
  buildPromptVariables: (input) => ({
    resume_facts_json: input.resumeFactsJson,
    resume_sections_json: input.resumeSectionsJson,
    resume_intelligence_version: String(input.resumeIntelligenceVersion),
  }),
};

export function buildResumeComposeInput(
  resumeFactsJson: string,
  resumeSectionsJson: string,
): ResumeComposeInput {
  return {
    resumeFactsJson,
    resumeSectionsJson,
    resumeIntelligenceVersion: RESUME_INTELLIGENCE_VERSION,
  };
}
