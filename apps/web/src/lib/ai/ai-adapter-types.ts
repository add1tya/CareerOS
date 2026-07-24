/**
 * AI Adapter Architecture v1 (ADR-0020).
 *
 * Public types for the adapter shell. Provider-specific types live under
 * providers/ and must not leak to callers.
 *
 * AI_ADAPTER_VERSION is independent of prompt file versions and of domain
 * schema / Planning / Explorer versions.
 */

import { z } from "zod";

export const AI_ADAPTER_VERSION = 1;

export const AI_INVOCATION_STATUSES = [
  "succeeded",
  "failed",
  "validation_failed",
  "timeout",
  "cancelled",
] as const;

export type AiInvocationStatus = (typeof AI_INVOCATION_STATUSES)[number];

export type AiProvenance = {
  invocationId: string;
  userId: string;
  taskType: string;
  providerId: string;
  model: string | null;
  promptId: string;
  promptVersion: number;
  adapterVersion: number;
  inputHash: string;
  status: AiInvocationStatus;
  errorCode: string | null;
  latencyMs: number;
  attemptCount: number;
  createdAt: string;
};

export type AiAdapterStatus = {
  adapterVersion: number;
  providerId: string;
  /** Resolved model id for the selected live provider; null for NullProvider. */
  configuredModel: string | null;
  keyConfigured: boolean;
  liveProviderReady: boolean;
  timeoutMs: number;
  note: string;
};

export type LoadedPrompt = {
  promptId: string;
  version: number;
  body: string;
  sourcePath: string;
};

export class AiAdapterError extends Error {
  readonly code: string;

  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "AiAdapterError";
    this.code = code;
  }
}

export class AiValidationError extends AiAdapterError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("validation_failed", message, options);
    this.name = "AiValidationError";
  }
}

export class AiTimeoutError extends AiAdapterError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("timeout", message, options);
    this.name = "AiTimeoutError";
  }
}

export class AiCancelledError extends AiAdapterError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("cancelled", message, options);
    this.name = "AiCancelledError";
  }
}

export class AiTransientError extends AiAdapterError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("transient", message, options);
    this.name = "AiTransientError";
  }
}

/** Diagnostic task I/O — the only product-facing task DTO in Sprint 23. */
export const adapterDiagnosticInputSchema = z.object({});

export type AdapterDiagnosticInput = z.infer<typeof adapterDiagnosticInputSchema>;

export const adapterDiagnosticOutputSchema = z.object({
  ok: z.literal(true),
  message: z.string().min(1),
  adapterVersion: z.number().int(),
});

export type AdapterDiagnosticOutput = z.infer<typeof adapterDiagnosticOutputSchema>;

export type AdapterDiagnosticResult = {
  output: AdapterDiagnosticOutput;
  provenance: AiProvenance;
};
