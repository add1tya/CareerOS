import { describe, expect, it, vi } from "vitest";

import {
  AiAdapterError,
  AiCancelledError,
  AiTransientError,
} from "@/lib/ai/ai-adapter-types";
import {
  GeminiProvider,
  type GeminiGenerateContent,
} from "@/lib/ai/providers/gemini-provider";

describe("GeminiProvider", () => {
  it("initializes with structured_completion capability", () => {
    const provider = new GeminiProvider("AIza-test", {
      generateContent: async () => ({ text: "{}" }),
    });
    expect(provider.id).toBe("gemini");
    expect(provider.capabilities.has("structured_completion")).toBe(true);
  });

  it("returns text and model on success", async () => {
    const generateContent = vi.fn<GeminiGenerateContent>(async () => ({
      text: '{"ok":true}',
      modelVersion: "gemini-2.5-flash",
    }));
    const provider = new GeminiProvider("AIza-test", {
      model: "gemini-2.5-flash",
      generateContent,
    });

    const result = await provider.completeStructured({
      system: "sys",
      user: "user",
      expectJson: true,
      signal: new AbortController().signal,
    });

    expect(result.text).toBe('{"ok":true}');
    expect(result.model).toBe("gemini-2.5-flash");
    expect(generateContent).toHaveBeenCalledOnce();
    const call = generateContent.mock.calls[0]?.[0];
    expect(call?.config.responseMimeType).toBe("application/json");
    expect(call?.model).toBe("gemini-2.5-flash");
  });

  it("cancels when signal already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const provider = new GeminiProvider("AIza-test", {
      generateContent: async () => ({ text: "{}" }),
    });
    await expect(
      provider.completeStructured({
        system: "s",
        user: "u",
        expectJson: true,
        signal: controller.signal,
      }),
    ).rejects.toBeInstanceOf(AiCancelledError);
  });

  it("maps timeout/abort during call to AiCancelledError", async () => {
    const controller = new AbortController();
    const provider = new GeminiProvider("AIza-test", {
      generateContent: async () => {
        controller.abort();
        const err = new Error("aborted");
        err.name = "AbortError";
        throw err;
      },
    });
    await expect(
      provider.completeStructured({
        system: "s",
        user: "u",
        expectJson: true,
        signal: controller.signal,
      }),
    ).rejects.toBeInstanceOf(AiCancelledError);
  });

  it("maps 401 to invalid_api_key", async () => {
    const provider = new GeminiProvider("bad-key", {
      generateContent: async () => {
        throw Object.assign(new Error("unauthorized"), { status: 401 });
      },
    });
    try {
      await provider.completeStructured({
        system: "s",
        user: "u",
        expectJson: true,
        signal: new AbortController().signal,
      });
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AiAdapterError);
      expect((err as AiAdapterError).code).toBe("invalid_api_key");
    }
  });

  it("maps 429 to transient quota error", async () => {
    const provider = new GeminiProvider("AIza-test", {
      generateContent: async () => {
        throw Object.assign(new Error("quota"), { status: 429 });
      },
    });
    await expect(
      provider.completeStructured({
        system: "s",
        user: "u",
        expectJson: true,
        signal: new AbortController().signal,
      }),
    ).rejects.toBeInstanceOf(AiTransientError);
  });

  it("fails on empty response", async () => {
    const provider = new GeminiProvider("AIza-test", {
      generateContent: async () => ({ text: "   " }),
    });
    await expect(
      provider.completeStructured({
        system: "s",
        user: "u",
        expectJson: true,
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({ code: "empty_provider_response" });
  });

  it("maps 404 to unsupported_model including model id", async () => {
    const provider = new GeminiProvider("AIza-test", {
      model: "gemini-2.5-flash",
      generateContent: async () => {
        throw Object.assign(
          new Error("models/gemini-2.5-flash is no longer available"),
          { status: 404 },
        );
      },
    });
    try {
      await provider.completeStructured({
        system: "s",
        user: "u",
        expectJson: true,
        signal: new AbortController().signal,
      });
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AiAdapterError);
      expect((err as AiAdapterError).code).toBe("unsupported_model");
      expect((err as AiAdapterError).message).toMatch(/gemini-2\.5-flash/);
      expect((err as AiAdapterError).message).toMatch(/no longer available/);
    }
  });
});
