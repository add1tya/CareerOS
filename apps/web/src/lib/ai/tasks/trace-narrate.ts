/**
 * AI Task: trace.narrate (ADR-0023).
 * Schemas + prompt refs only — no ranking / Evidence writes.
 */

import { z } from "zod";

import type { AiTask } from "@/lib/ai/tasks/types";
import {
  NARRATIVE_SECTION_KEYS,
  TRACE_NARRATOR_VERSION,
} from "@/lib/decision-engine/trace-narrator-types";

export const TRACE_NARRATE_TASK_TYPE = "trace.narrate";
export const TRACE_NARRATE_PROMPT_ID = "trace.narrate";
export const TRACE_NARRATE_PROMPT_VERSION = 1;

export const traceNarrateSectionSchema = z.object({
  key: z.enum(NARRATIVE_SECTION_KEYS),
  prose: z.string().min(1).max(1200),
  citationIds: z.array(z.string().min(1)).min(1).max(20),
});

export const traceNarrateOutputSchema = z.object({
  sections: z.array(traceNarrateSectionSchema).min(6).max(6),
  uncertaintyNote: z.string().max(500).nullable().optional(),
});

export type TraceNarrateOutput = z.infer<typeof traceNarrateOutputSchema>;

export const traceNarrateInputSchema = z.object({
  traceFactsJson: z.string().min(2),
  narratorVersion: z.number().int(),
});

export type TraceNarrateInput = z.infer<typeof traceNarrateInputSchema>;

export const traceNarrateTask: AiTask<TraceNarrateInput, TraceNarrateOutput> = {
  taskType: TRACE_NARRATE_TASK_TYPE,
  promptId: TRACE_NARRATE_PROMPT_ID,
  promptVersion: TRACE_NARRATE_PROMPT_VERSION,
  inputSchema: traceNarrateInputSchema,
  outputSchema: traceNarrateOutputSchema,
  buildPromptVariables: (input) => ({
    trace_facts_json: input.traceFactsJson,
    narrator_version: String(input.narratorVersion),
  }),
};

export function buildTraceNarrateInput(traceFactsJson: string): TraceNarrateInput {
  return {
    traceFactsJson,
    narratorVersion: TRACE_NARRATOR_VERSION,
  };
}
