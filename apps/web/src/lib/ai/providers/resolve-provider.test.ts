import { afterEach, describe, expect, it } from "vitest";

import { AiAdapterError } from "@/lib/ai/ai-adapter-types";
import { AnthropicProvider } from "@/lib/ai/providers/anthropic-provider";
import { GeminiProvider } from "@/lib/ai/providers/gemini-provider";
import { NullProvider } from "@/lib/ai/providers/null-provider";
import {
  resolveProvider,
  resolveProviderForStatus,
} from "@/lib/ai/providers/resolve-provider";

const ENV_KEYS = [
  "AI_PROVIDER",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_MODEL",
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "AI_ADAPTER_TIMEOUT_MS",
] as const;

function clearAiEnv() {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
}

afterEach(() => {
  clearAiEnv();
});

describe("resolveProvider factory", () => {
  it("defaults to NullProvider", () => {
    clearAiEnv();
    const resolved = resolveProvider();
    expect(resolved.provider).toBeInstanceOf(NullProvider);
    expect(resolved.provider.id).toBe("null");
    expect(resolved.liveProviderReady).toBe(false);
    expect(resolved.provider.capabilities.has("structured_completion")).toBe(
      true,
    );
  });

  it("resolves anthropic when key is set", () => {
    process.env.AI_PROVIDER = "anthropic";
    process.env.ANTHROPIC_API_KEY = "sk-test";
    const resolved = resolveProvider();
    expect(resolved.provider).toBeInstanceOf(AnthropicProvider);
    expect(resolved.keyConfigured).toBe(true);
    expect(resolved.liveProviderReady).toBe(true);
  });

  it("fails loud when anthropic key missing", () => {
    process.env.AI_PROVIDER = "anthropic";
    expect(() => resolveProvider()).toThrow(AiAdapterError);
    try {
      resolveProvider();
    } catch (err) {
      expect(err).toBeInstanceOf(AiAdapterError);
      expect((err as AiAdapterError).code).toBe("api_key_missing");
    }
  });

  it("resolves gemini when key is set", () => {
    process.env.AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "AIza-test";
    const resolved = resolveProvider();
    expect(resolved.provider).toBeInstanceOf(GeminiProvider);
    expect(resolved.provider.id).toBe("gemini");
    expect(resolved.keyConfigured).toBe(true);
    expect(resolved.liveProviderReady).toBe(true);
  });

  it("fails loud when gemini key missing", () => {
    process.env.AI_PROVIDER = "gemini";
    expect(() => resolveProvider()).toThrow(AiAdapterError);
    try {
      resolveProvider();
    } catch (err) {
      expect((err as AiAdapterError).code).toBe("api_key_missing");
    }
  });

  it("rejects unsupported provider selection", () => {
    process.env.AI_PROVIDER = "openai";
    expect(() => resolveProvider()).toThrow(/Unsupported AI_PROVIDER/);
    const status = resolveProviderForStatus();
    expect(status.liveProviderReady).toBe(false);
    expect(status.configError).toMatch(/Unsupported AI_PROVIDER="openai"/);
  });
});

describe("resolveProviderForStatus", () => {
  it("reports gemini ready when key configured", () => {
    process.env.AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "AIza-test";
    const status = resolveProviderForStatus();
    expect(status).toMatchObject({
      providerId: "gemini",
      configuredModel: "gemini-3.6-flash",
      keyConfigured: true,
      liveProviderReady: true,
      configError: null,
    });
  });

  it("reports gemini not ready when key missing", () => {
    process.env.AI_PROVIDER = "gemini";
    const status = resolveProviderForStatus();
    expect(status.keyConfigured).toBe(false);
    expect(status.liveProviderReady).toBe(false);
    expect(status.configError).toMatch(/GEMINI_API_KEY/);
  });
});
