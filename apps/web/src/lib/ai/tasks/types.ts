/**
 * AI Task contract (ADR-0020).
 *
 * Tasks own: schemas, prompt references, input construction (variable maps).
 * Tasks must not: call providers, retry, validate, or write domain state.
 */

import type { z } from "zod";

export type AiTask<TInput, TOutput> = {
  /** Stable task id, e.g. adapter.diagnostic */
  taskType: string;
  promptId: string;
  /** Expected prompt file version — Runtime fails loud on mismatch. */
  promptVersion: number;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  /**
   * Explicit substitution variables for the prompt template.
   * Prompt Loader performs {{key}} replacement only — no other generation.
   */
  buildPromptVariables: (input: TInput) => Record<string, string>;
};
