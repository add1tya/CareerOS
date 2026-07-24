/**
 * Provider types — INTERNAL to the adapter subsystem (ADR-0020 / ADR-0021).
 * Must not be imported by domain engines or leave Runtime.
 *
 * Capability-oriented: providers declare what they support. V1 only requires
 * `structured_completion`. Future methods (chat, embeddings, tools, streaming,
 * …) can be added without renaming today’s surface into a single chat() API.
 */

/** Known capability ids. Providers may omit unimplemented ones. */
export type AiProviderCapability =
  | "structured_completion"
  | "chat"
  | "embeddings"
  | "classification"
  | "reranking"
  | "tool_calling"
  | "multimodal"
  | "streaming";

export type ProviderStructuredRequest = {
  system: string;
  user: string;
  /** Hint for providers that support JSON-only replies. */
  expectJson: boolean;
  signal: AbortSignal;
};

export type ProviderRawResponse = {
  /** Raw model text — Runtime parses + validates; callers never see this. */
  text: string;
  model: string | null;
};

/**
 * Vendor transport. Runtime talks only through declared capabilities.
 * Do not design callers around a single chat() method.
 */
export interface AiProvider {
  readonly id: string;
  readonly displayName: string;
  /** Capabilities this implementation supports today. */
  readonly capabilities: ReadonlySet<AiProviderCapability>;
  /**
   * Structured completion — current V1 capability used by AI Runtime.
   * Required when `capabilities` includes `structured_completion`.
   */
  completeStructured(
    request: ProviderStructuredRequest,
  ): Promise<ProviderRawResponse>;
}

export const STRUCTURED_COMPLETION_ONLY: ReadonlySet<AiProviderCapability> =
  new Set<AiProviderCapability>(["structured_completion"]);
