/**
 * AI Runtime (ADR-0020).
 *
 * Owns: retries, timeout, cancellation, validation, provenance, metrics.
 * Must not: invent prompts, own product schemas, or write domain state.
 * Provider-specific types never leave this module.
 */

import { createHash, randomUUID } from "node:crypto";

import {
  AI_ADAPTER_VERSION,
  AiAdapterError,
  AiCancelledError,
  AiTimeoutError,
  AiTransientError,
  AiValidationError,
  type AiInvocationStatus,
  type AiProvenance,
} from "@/lib/ai/ai-adapter-types";
import {
  loadPrompt,
  substitutePromptVariables,
} from "@/lib/ai/prompt-loader";
import type { AiProvider } from "@/lib/ai/providers/types";
import type { AiTask } from "@/lib/ai/tasks/types";

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 3;

export type RuntimeRunOptions = {
  userId: string;
  timeoutMs?: number;
  /** External cancellation (e.g. request abort). */
  signal?: AbortSignal;
};

export type RuntimeRunSuccess<TOutput> = {
  output: TOutput;
  provenance: AiProvenance;
};

export async function runAiTask<TInput, TOutput>(
  task: AiTask<TInput, TOutput>,
  input: TInput,
  provider: AiProvider,
  options: RuntimeRunOptions,
): Promise<RuntimeRunSuccess<TOutput>> {
  const parsedInput = task.inputSchema.safeParse(input);
  if (!parsedInput.success) {
    throw new AiValidationError(
      `Invalid input for task ${task.taskType}: ${parsedInput.error.message}`,
    );
  }

  const timeoutMs =
    options.timeoutMs ??
    Number(process.env.AI_ADAPTER_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);

  const prompt = loadPrompt(task.promptId, task.promptVersion);
  const variables = task.buildPromptVariables(parsedInput.data);
  const userPrompt = substitutePromptVariables(prompt.body, variables);
  const inputHash = hashInput(task.taskType, parsedInput.data, userPrompt);

  const started = Date.now();
  let attemptCount = 0;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    attemptCount = attempt;
    const controller = new AbortController();
    const onParentAbort = () => controller.abort();
    options.signal?.addEventListener("abort", onParentAbort);

    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      if (options.signal?.aborted) {
        throw new AiCancelledError("AI Runtime cancelled before attempt.");
      }

      const raw = await provider.completeStructured({
        system:
          "You are a CareerOS infrastructure probe. Follow the user instructions exactly. Reply with JSON only when asked.",
        user: userPrompt,
        expectJson: true,
        signal: controller.signal,
      });

      const output = parseAndValidate(task, raw.text);

      const provenance = buildProvenance({
        userId: options.userId,
        taskType: task.taskType,
        providerId: provider.id,
        model: raw.model,
        promptId: prompt.promptId,
        promptVersion: prompt.version,
        inputHash,
        status: "succeeded",
        errorCode: null,
        latencyMs: Date.now() - started,
        attemptCount,
      });

      return { output, provenance };
    } catch (err) {
      lastError = err;

      if (err instanceof AiValidationError) {
        const provenance = buildProvenance({
          userId: options.userId,
          taskType: task.taskType,
          providerId: provider.id,
          model: null,
          promptId: prompt.promptId,
          promptVersion: prompt.version,
          inputHash,
          status: "validation_failed",
          errorCode: err.code,
          latencyMs: Date.now() - started,
          attemptCount,
        });
        throw Object.assign(err, { provenance });
      }

      const timedOut =
        controller.signal.aborted && !options.signal?.aborted;
      const cancelled = Boolean(options.signal?.aborted);

      if (cancelled) {
        const e = new AiCancelledError("AI Runtime cancelled.", { cause: err });
        const provenance = buildProvenance({
          userId: options.userId,
          taskType: task.taskType,
          providerId: provider.id,
          model: null,
          promptId: prompt.promptId,
          promptVersion: prompt.version,
          inputHash,
          status: "cancelled",
          errorCode: e.code,
          latencyMs: Date.now() - started,
          attemptCount,
        });
        throw Object.assign(e, { provenance });
      }

      if (timedOut || err instanceof AiTimeoutError) {
        const e =
          err instanceof AiTimeoutError
            ? err
            : new AiTimeoutError(
                `AI Runtime timed out after ${timeoutMs}ms.`,
                { cause: err },
              );
        if (attempt < MAX_ATTEMPTS) {
          await sleep(backoffMs(attempt));
          continue;
        }
        const provenance = buildProvenance({
          userId: options.userId,
          taskType: task.taskType,
          providerId: provider.id,
          model: null,
          promptId: prompt.promptId,
          promptVersion: prompt.version,
          inputHash,
          status: "timeout",
          errorCode: e.code,
          latencyMs: Date.now() - started,
          attemptCount,
        });
        throw Object.assign(e, { provenance });
      }

      if (err instanceof AiTransientError && attempt < MAX_ATTEMPTS) {
        await sleep(backoffMs(attempt));
        continue;
      }

      const mapped =
        err instanceof AiAdapterError
          ? err
          : new AiAdapterError(
              "runtime_error",
              err instanceof Error ? err.message : "AI Runtime error",
              { cause: err },
            );

      const provenance = buildProvenance({
        userId: options.userId,
        taskType: task.taskType,
        providerId: provider.id,
        model: null,
        promptId: prompt.promptId,
        promptVersion: prompt.version,
        inputHash,
        status: "failed",
        errorCode: mapped.code,
        latencyMs: Date.now() - started,
        attemptCount,
      });
      throw Object.assign(mapped, { provenance });
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onParentAbort);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new AiAdapterError("runtime_error", "AI Runtime exhausted attempts.");
}

function parseAndValidate<TInput, TOutput>(
  task: AiTask<TInput, TOutput>,
  text: string,
): TOutput {
  let jsonText = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```$/i.exec(jsonText);
  if (fenced?.[1]) {
    jsonText = fenced[1].trim();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText) as unknown;
  } catch (err) {
    throw new AiValidationError(
      `Provider returned non-JSON for ${task.taskType}.`,
      { cause: err },
    );
  }

  const result = task.outputSchema.safeParse(parsed);
  if (!result.success) {
    throw new AiValidationError(
      `Output failed schema for ${task.taskType}: ${result.error.message}`,
    );
  }

  return result.data;
}

function buildProvenance(args: {
  userId: string;
  taskType: string;
  providerId: string;
  model: string | null;
  promptId: string;
  promptVersion: number;
  inputHash: string;
  status: AiInvocationStatus;
  errorCode: string | null;
  latencyMs: number;
  attemptCount: number;
}): AiProvenance {
  return {
    invocationId: randomUUID(),
    userId: args.userId,
    taskType: args.taskType,
    providerId: args.providerId,
    model: args.model,
    promptId: args.promptId,
    promptVersion: args.promptVersion,
    adapterVersion: AI_ADAPTER_VERSION,
    inputHash: args.inputHash,
    status: args.status,
    errorCode: args.errorCode,
    latencyMs: args.latencyMs,
    attemptCount: args.attemptCount,
    createdAt: new Date().toISOString(),
  };
}

function hashInput(taskType: string, input: unknown, promptBody: string): string {
  return createHash("sha256")
    .update(taskType)
    .update("\0")
    .update(JSON.stringify(input))
    .update("\0")
    .update(promptBody)
    .digest("hex");
}

function backoffMs(attempt: number): number {
  return Math.min(1000 * 2 ** (attempt - 1), 4000);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getProvenanceFromError(err: unknown): AiProvenance | null {
  if (
    typeof err === "object" &&
    err !== null &&
    "provenance" in err &&
    typeof (err as { provenance: unknown }).provenance === "object"
  ) {
    return (err as { provenance: AiProvenance }).provenance;
  }
  return null;
}
