/**
 * Adapter diagnostic task — Sprint 23 smoke test only (ADR-0020).
 * Not Mentor, personalization, or domain advice.
 */

import { AI_ADAPTER_VERSION } from "@/lib/ai/ai-adapter-types";
import {
  adapterDiagnosticInputSchema,
  adapterDiagnosticOutputSchema,
  type AdapterDiagnosticInput,
  type AdapterDiagnosticOutput,
} from "@/lib/ai/ai-adapter-types";
import type { AiTask } from "@/lib/ai/tasks/types";

export const ADAPTER_DIAGNOSTIC_TASK_TYPE = "adapter.diagnostic";

export const adapterDiagnosticTask: AiTask<
  AdapterDiagnosticInput,
  AdapterDiagnosticOutput
> = {
  taskType: ADAPTER_DIAGNOSTIC_TASK_TYPE,
  promptId: "adapter.diagnostic",
  promptVersion: 1,
  inputSchema: adapterDiagnosticInputSchema,
  outputSchema: adapterDiagnosticOutputSchema,
  buildPromptVariables: () => ({
    adapter_version: String(AI_ADAPTER_VERSION),
  }),
};
