/**
 * GeminiProvider — live Google Gemini transport (ADR-0021).
 * Uses official @google/genai SDK. Provider types stay inside the adapter.
 */

import { GoogleGenAI } from "@google/genai";

import { AiAdapterError, AiCancelledError } from "@/lib/ai/ai-adapter-types";
import { rethrowAsAdapterError } from "@/lib/ai/providers/provider-errors";
import {
  STRUCTURED_COMPLETION_ONLY,
  type AiProvider,
  type AiProviderCapability,
  type ProviderRawResponse,
  type ProviderStructuredRequest,
} from "@/lib/ai/providers/types";

/** Current stable Flash default (Gemini 2.5 retired on many keys — Jul 2026). Override with GEMINI_MODEL. */
export const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";

/** Narrow client surface for tests — avoids mocking the whole SDK. */
export type GeminiGenerateContent = (args: {
  model: string;
  contents: string;
  config: {
    systemInstruction: string;
    responseMimeType?: string;
    abortSignal: AbortSignal;
    httpOptions?: { timeout?: number };
  };
}) => Promise<{ text?: string | null; modelVersion?: string }>;

export type GeminiProviderOptions = {
  model?: string;
  /** Optional HTTP timeout (ms) forwarded to the SDK. Runtime still enforces AbortSignal. */
  httpTimeoutMs?: number;
  /** Injectable generateContent for unit tests. */
  generateContent?: GeminiGenerateContent;
};

export class GeminiProvider implements AiProvider {
  readonly id = "gemini";
  readonly displayName = "Google Gemini";
  readonly capabilities: ReadonlySet<AiProviderCapability> =
    STRUCTURED_COMPLETION_ONLY;

  private readonly model: string;
  private readonly httpTimeoutMs: number | undefined;
  private readonly generateContent: GeminiGenerateContent;

  constructor(apiKey: string, options: GeminiProviderOptions = {}) {
    this.model = options.model?.trim() || DEFAULT_GEMINI_MODEL;
    this.httpTimeoutMs = options.httpTimeoutMs;

    if (options.generateContent) {
      this.generateContent = options.generateContent;
    } else {
      const client = new GoogleGenAI({ apiKey });
      this.generateContent = (args) => client.models.generateContent(args);
    }
  }

  async completeStructured(
    request: ProviderStructuredRequest,
  ): Promise<ProviderRawResponse> {
    if (request.signal.aborted) {
      throw new AiCancelledError("Gemini request cancelled before start.");
    }

    try {
      const response = await this.generateContent({
        model: this.model,
        contents: request.user,
        config: {
          systemInstruction: request.system,
          responseMimeType: request.expectJson
            ? "application/json"
            : undefined,
          abortSignal: request.signal,
          httpOptions:
            this.httpTimeoutMs !== undefined
              ? { timeout: this.httpTimeoutMs }
              : undefined,
        },
      });

      const text = (response.text ?? "").trim();
      if (!text) {
        throw new AiAdapterError(
          "empty_provider_response",
          "Gemini returned no text content.",
        );
      }

      return {
        text,
        model: response.modelVersion ?? this.model,
      };
    } catch (err) {
      if (err instanceof AiAdapterError) throw err;
      rethrowAsAdapterError(err, request.signal, "Gemini", {
        model: this.model,
      });
    }
  }
}
