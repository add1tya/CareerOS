/**
 * Resolve configured AI provider from env (ADR-0020 / ADR-0021).
 * Domain engines must never import this module.
 *
 * Supported: null | anthropic | gemini
 */

import { AiAdapterError } from "@/lib/ai/ai-adapter-types";
import { AnthropicProvider } from "@/lib/ai/providers/anthropic-provider";
import {
  DEFAULT_GEMINI_MODEL,
  GeminiProvider,
} from "@/lib/ai/providers/gemini-provider";
import { NullProvider } from "@/lib/ai/providers/null-provider";
import type { AiProvider } from "@/lib/ai/providers/types";

export type ResolvedProvider = {
  provider: AiProvider;
  keyConfigured: boolean;
  liveProviderReady: boolean;
};

const SUPPORTED = "null, anthropic, or gemini";
const DEFAULT_ANTHROPIC_MODEL = "claude-3-5-haiku-20241022";

export function resolveConfiguredModel(providerId: string): string | null {
  if (providerId === "anthropic") {
    return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL;
  }
  if (providerId === "gemini") {
    return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  }
  return null;
}

export function resolveProvider(): ResolvedProvider {
  const raw = (process.env.AI_PROVIDER ?? "null").trim().toLowerCase();

  if (raw === "null" || raw === "none" || raw === "offline") {
    return {
      provider: new NullProvider(),
      keyConfigured: false,
      liveProviderReady: false,
    };
  }

  if (raw === "anthropic") {
    const key = process.env.ANTHROPIC_API_KEY?.trim() ?? "";
    if (!key) {
      throw new AiAdapterError(
        "api_key_missing",
        "AI_PROVIDER=anthropic but ANTHROPIC_API_KEY is not set.",
      );
    }
    const model = process.env.ANTHROPIC_MODEL?.trim() || undefined;
    return {
      provider: new AnthropicProvider(key, model),
      keyConfigured: true,
      liveProviderReady: true,
    };
  }

  if (raw === "gemini") {
    const key = process.env.GEMINI_API_KEY?.trim() ?? "";
    if (!key) {
      throw new AiAdapterError(
        "api_key_missing",
        "AI_PROVIDER=gemini but GEMINI_API_KEY is not set.",
      );
    }
    const model = process.env.GEMINI_MODEL?.trim() || undefined;
    const timeoutRaw = process.env.AI_ADAPTER_TIMEOUT_MS;
    const httpTimeoutMs =
      timeoutRaw !== undefined && timeoutRaw.trim() !== ""
        ? Number(timeoutRaw)
        : undefined;

    return {
      provider: new GeminiProvider(key, {
        model,
        httpTimeoutMs:
          httpTimeoutMs !== undefined && Number.isFinite(httpTimeoutMs)
            ? httpTimeoutMs
            : undefined,
      }),
      keyConfigured: true,
      liveProviderReady: true,
    };
  }

  throw new AiAdapterError(
    "unknown_provider",
    `Unsupported AI_PROVIDER="${raw}". Use ${SUPPORTED}.`,
  );
}

/** Status path: never throws on missing live keys. */
export function resolveProviderForStatus(): {
  providerId: string;
  configuredModel: string | null;
  keyConfigured: boolean;
  liveProviderReady: boolean;
  configError: string | null;
} {
  const raw = (process.env.AI_PROVIDER ?? "null").trim().toLowerCase();

  if (raw === "null" || raw === "none" || raw === "offline") {
    return {
      providerId: "null",
      configuredModel: null,
      keyConfigured: false,
      liveProviderReady: false,
      configError: null,
    };
  }

  if (raw === "anthropic") {
    const keyConfigured = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
    return {
      providerId: "anthropic",
      configuredModel: resolveConfiguredModel("anthropic"),
      keyConfigured,
      liveProviderReady: keyConfigured,
      configError: keyConfigured
        ? null
        : "AI_PROVIDER=anthropic but ANTHROPIC_API_KEY is not set.",
    };
  }

  if (raw === "gemini") {
    const keyConfigured = Boolean(process.env.GEMINI_API_KEY?.trim());
    return {
      providerId: "gemini",
      configuredModel: resolveConfiguredModel("gemini"),
      keyConfigured,
      liveProviderReady: keyConfigured,
      configError: keyConfigured
        ? null
        : "AI_PROVIDER=gemini but GEMINI_API_KEY is not set.",
    };
  }

  return {
    providerId: raw,
    configuredModel: null,
    keyConfigured: false,
    liveProviderReady: false,
    configError: `Unsupported AI_PROVIDER="${raw}". Use ${SUPPORTED}.`,
  };
}
