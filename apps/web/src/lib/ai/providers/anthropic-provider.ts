/**
 * AnthropicProvider — live Anthropic transport (ADR-0020).
 * Provider response types stay inside this module / Runtime.
 */

import Anthropic from "@anthropic-ai/sdk";

import { AiAdapterError, AiCancelledError } from "@/lib/ai/ai-adapter-types";
import { rethrowAsAdapterError } from "@/lib/ai/providers/provider-errors";
import {
  STRUCTURED_COMPLETION_ONLY,
  type AiProvider,
  type AiProviderCapability,
  type ProviderRawResponse,
  type ProviderStructuredRequest,
} from "@/lib/ai/providers/types";

const DEFAULT_MODEL = "claude-3-5-haiku-20241022";

export class AnthropicProvider implements AiProvider {
  readonly id = "anthropic";
  readonly displayName = "Anthropic";
  readonly capabilities: ReadonlySet<AiProviderCapability> =
    STRUCTURED_COMPLETION_ONLY;

  private readonly client: Anthropic;
  private readonly model: string;

  constructor(apiKey: string, model = DEFAULT_MODEL) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async completeStructured(
    request: ProviderStructuredRequest,
  ): Promise<ProviderRawResponse> {
    if (request.signal.aborted) {
      throw new AiCancelledError("Anthropic request cancelled before start.");
    }

    try {
      const message = await this.client.messages.create(
        {
          model: this.model,
          max_tokens: 256,
          system: request.system,
          messages: [{ role: "user", content: request.user }],
        },
        { signal: request.signal },
      );

      const text = message.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();

      if (!text) {
        throw new AiAdapterError(
          "empty_provider_response",
          "Anthropic returned no text content.",
        );
      }

      return { text, model: message.model };
    } catch (err) {
      if (err instanceof AiAdapterError) throw err;
      rethrowAsAdapterError(err, request.signal, "Anthropic");
    }
  }
}
