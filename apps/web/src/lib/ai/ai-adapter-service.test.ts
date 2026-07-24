import { afterEach, describe, expect, it, vi } from "vitest";

import { getAiAdapterStatus } from "@/lib/ai/ai-adapter-service";
import { AI_ADAPTER_VERSION } from "@/lib/ai/ai-adapter-types";
import { NullProvider } from "@/lib/ai/providers/null-provider";
import { runAiTask } from "@/lib/ai/runtime/ai-runtime";
import { adapterDiagnosticTask } from "@/lib/ai/tasks/adapter-diagnostic";

afterEach(() => {
  delete process.env.AI_PROVIDER;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.GEMINI_API_KEY;
});

describe("getAiAdapterStatus (diagnostics)", () => {
  it("reports null provider by default", () => {
    const status = getAiAdapterStatus();
    expect(status.adapterVersion).toBe(AI_ADAPTER_VERSION);
    expect(status.providerId).toBe("null");
    expect(status.liveProviderReady).toBe(false);
  });

  it("reports gemini ready when configured", () => {
    process.env.AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "AIza-test";
    const status = getAiAdapterStatus();
    expect(status.providerId).toBe("gemini");
    expect(status.configuredModel).toBe("gemini-3.6-flash");
    expect(status.keyConfigured).toBe(true);
    expect(status.liveProviderReady).toBe(true);
    expect(status.note).toMatch(/Live provider configured/i);
  });
});

describe("runAiTask provenance", () => {
  it("appends succeeded provenance for NullProvider diagnostic", async () => {
    const result = await runAiTask(
      adapterDiagnosticTask,
      {},
      new NullProvider(),
      { userId: "00000000-0000-0000-0000-000000000001" },
    );

    expect(result.output.ok).toBe(true);
    expect(result.provenance.providerId).toBe("null");
    expect(result.provenance.status).toBe("succeeded");
    expect(result.provenance.taskType).toBe("adapter.diagnostic");
    expect(result.provenance.adapterVersion).toBe(AI_ADAPTER_VERSION);
    expect(result.provenance.attemptCount).toBeGreaterThanOrEqual(1);
    expect(result.provenance.inputHash.length).toBeGreaterThan(8);
    expect(result.provenance.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("records validation_failed provenance without retrying forever", async () => {
    const badProvider = {
      id: "null",
      displayName: "bad",
      capabilities: new Set(["structured_completion"] as const),
      completeStructured: vi.fn(async () => ({
        text: "not-json",
        model: "x",
      })),
    };

    await expect(
      runAiTask(adapterDiagnosticTask, {}, badProvider, {
        userId: "00000000-0000-0000-0000-000000000002",
      }),
    ).rejects.toMatchObject({
      code: "validation_failed",
      provenance: expect.objectContaining({
        status: "validation_failed",
        providerId: "null",
      }),
    });
  });
});
