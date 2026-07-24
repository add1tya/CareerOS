/**
 * Shared provider error helpers (ADR-0020 / ADR-0021).
 * Keeps Anthropic / Gemini / future vendors mapping to the same adapter errors.
 */

import {
  AiAdapterError,
  AiCancelledError,
  AiTransientError,
} from "@/lib/ai/ai-adapter-types";

export function isAbortError(err: unknown): boolean {
  return (
    (err instanceof Error && err.name === "AbortError") ||
    (typeof err === "object" &&
      err !== null &&
      "name" in err &&
      (err as { name: string }).name === "AbortError")
  );
}

export function httpStatusOf(err: unknown): number | null {
  if (typeof err !== "object" || err === null) return null;
  if (
    "status" in err &&
    typeof (err as { status: unknown }).status === "number"
  ) {
    return (err as { status: number }).status;
  }
  if (
    "statusCode" in err &&
    typeof (err as { statusCode: unknown }).statusCode === "number"
  ) {
    return (err as { statusCode: number }).statusCode;
  }
  return null;
}

export function isTransientProviderError(err: unknown): boolean {
  const status = httpStatusOf(err);
  if (status === 429 || status === 408) return true;
  if (status !== null && status >= 500) return true;
  if (
    err instanceof Error &&
    /ECONNRESET|ETIMEDOUT|fetch failed|network/i.test(err.message)
  ) {
    return true;
  }
  return false;
}

/**
 * Map vendor failures into adapter errors. Never leak SDK types to callers.
 */
export function rethrowAsAdapterError(
  err: unknown,
  signal: AbortSignal,
  providerLabel: string,
  context?: { model?: string },
): never {
  if (signal.aborted || isAbortError(err)) {
    throw new AiCancelledError(`${providerLabel} request aborted.`, {
      cause: err,
    });
  }

  const status = httpStatusOf(err);
  const apiMessage =
    err instanceof Error && err.message.trim() ? err.message.trim() : null;
  const modelLabel = context?.model ? ` "${context.model}"` : "";

  if (status === 401 || status === 403) {
    throw new AiAdapterError(
      "invalid_api_key",
      `${providerLabel} rejected the API key.`,
      { cause: err },
    );
  }
  if (status === 404) {
    throw new AiAdapterError(
      "unsupported_model",
      `${providerLabel} model${modelLabel} was not found or is unsupported.${
        apiMessage ? ` ${apiMessage}` : ""
      } Set GEMINI_MODEL (or ANTHROPIC_MODEL) to a currently available model id.`,
      { cause: err },
    );
  }
  if (status === 429) {
    throw new AiTransientError(`${providerLabel} quota or rate limit exceeded.`, {
      cause: err,
    });
  }
  if (isTransientProviderError(err)) {
    throw new AiTransientError(
      err instanceof Error
        ? err.message
        : `Transient ${providerLabel} error`,
      { cause: err },
    );
  }

  throw new AiAdapterError(
    "provider_error",
    err instanceof Error ? err.message : `${providerLabel} provider error`,
    { cause: err },
  );
}
