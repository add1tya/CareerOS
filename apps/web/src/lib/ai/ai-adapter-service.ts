/**
 * AI Adapter service — approved boundary for calling Runtime (ADR-0020).
 *
 * Domain engines (Decision, Planning, mastery, History) must not import this
 * module’s provider/runtime internals. Product surfaces use status + diagnostic
 * only in Sprint 23.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  AI_ADAPTER_VERSION,
  AiAdapterError,
  type AdapterDiagnosticResult,
  type AiAdapterStatus,
  type AiProvenance,
} from "@/lib/ai/ai-adapter-types";
import {
  resolveProvider,
  resolveProviderForStatus,
} from "@/lib/ai/providers/resolve-provider";
import {
  getProvenanceFromError,
  runAiTask,
  type RuntimeRunSuccess,
} from "@/lib/ai/runtime/ai-runtime";
import { adapterDiagnosticTask } from "@/lib/ai/tasks/adapter-diagnostic";
import type { AiTask } from "@/lib/ai/tasks/types";

const DEFAULT_TIMEOUT_MS = 30_000;

export function getAiAdapterStatus(): AiAdapterStatus {
  const resolved = resolveProviderForStatus();
  const timeoutMs = Number(
    process.env.AI_ADAPTER_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS,
  );

  let note: string;
  if (resolved.configError) {
    note = resolved.configError;
  } else if (resolved.providerId === "null") {
    note =
      "Using NullProvider — no live model. Set AI_PROVIDER=anthropic|gemini and the matching API key for a live diagnostic.";
  } else {
    note = "Live provider configured. Diagnostic will call the model.";
  }

  return {
    adapterVersion: AI_ADAPTER_VERSION,
    providerId: resolved.providerId,
    configuredModel: resolved.configuredModel,
    keyConfigured: resolved.keyConfigured,
    liveProviderReady: resolved.liveProviderReady,
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_TIMEOUT_MS,
    note,
  };
}

export async function runAdapterDiagnostic(
  supabase: SupabaseClient,
  userId: string,
  options?: { signal?: AbortSignal },
): Promise<AdapterDiagnosticResult> {
  return runAiTaskPersisted(supabase, userId, adapterDiagnosticTask, {}, options);
}

/**
 * Approved Adapter entry for product tasks: resolve provider, run Runtime,
 * append ai_invocations. Never writes Evidence / Mastery / Planning.
 */
export async function runAiTaskPersisted<TInput, TOutput>(
  supabase: SupabaseClient,
  userId: string,
  task: AiTask<TInput, TOutput>,
  input: TInput,
  options?: { signal?: AbortSignal },
): Promise<RuntimeRunSuccess<TOutput>> {
  let provider;
  try {
    provider = resolveProvider().provider;
  } catch (err) {
    const mapped =
      err instanceof AiAdapterError
        ? err
        : new AiAdapterError(
            "provider_resolve_failed",
            err instanceof Error ? err.message : "Provider resolve failed",
            { cause: err },
          );
    const provenance = syntheticFailedProvenance(userId, mapped.code, task);
    await persistInvocation(supabase, provenance);
    throw Object.assign(mapped, { provenance });
  }

  try {
    const result = await runAiTask(task, input, provider, {
      userId,
      signal: options?.signal,
    });
    await persistInvocation(supabase, result.provenance);
    return result;
  } catch (err) {
    const provenance = getProvenanceFromError(err);
    if (provenance) {
      await persistInvocation(supabase, provenance);
    }
    throw err;
  }
}

async function persistInvocation(
  supabase: SupabaseClient,
  provenance: AiProvenance,
): Promise<void> {
  const { error } = await supabase.from("ai_invocations").insert({
    id: provenance.invocationId,
    user_id: provenance.userId,
    task_type: provenance.taskType,
    provider_id: provenance.providerId,
    model: provenance.model,
    prompt_id: provenance.promptId,
    prompt_version: provenance.promptVersion,
    adapter_version: provenance.adapterVersion,
    input_hash: provenance.inputHash,
    status: provenance.status,
    error_code: provenance.errorCode,
    latency_ms: provenance.latencyMs,
    attempt_count: provenance.attemptCount,
    created_at: provenance.createdAt,
  });

  if (error) {
    // Fail loud on provenance persistence — do not silently drop audit rows.
    throw new AiAdapterError(
      "provenance_persist_failed",
      `Failed to append ai_invocations: ${error.message}`,
      { cause: error },
    );
  }
}

function syntheticFailedProvenance(
  userId: string,
  errorCode: string,
  task: { taskType: string; promptId: string; promptVersion: number } = adapterDiagnosticTask,
): AiProvenance {
  return {
    invocationId: crypto.randomUUID(),
    userId,
    taskType: task.taskType,
    providerId: "unresolved",
    model: null,
    promptId: task.promptId,
    promptVersion: task.promptVersion,
    adapterVersion: AI_ADAPTER_VERSION,
    inputHash: "unresolved",
    status: "failed",
    errorCode,
    latencyMs: 0,
    attemptCount: 0,
    createdAt: new Date().toISOString(),
  };
}
