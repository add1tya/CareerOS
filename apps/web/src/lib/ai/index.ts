/**
 * Public adapter surface for product code (ADR-0020).
 *
 * Do not re-export providers, SDKs, or Runtime from here for domain engines.
 * Domain engines must not import @/lib/ai at all.
 */

export {
  AI_ADAPTER_VERSION,
  AiAdapterError,
  AiValidationError,
  AiTimeoutError,
  AiCancelledError,
  type AiAdapterStatus,
  type AiProvenance,
  type AdapterDiagnosticOutput,
  type AdapterDiagnosticResult,
} from "@/lib/ai/ai-adapter-types";

export {
  getAiAdapterStatus,
  runAdapterDiagnostic,
} from "@/lib/ai/ai-adapter-service";
