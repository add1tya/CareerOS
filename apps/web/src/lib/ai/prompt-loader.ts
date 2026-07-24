/**
 * Read-only Prompt Loader (ADR-0020).
 *
 * Loads from the registered prompt catalog, verifies version, returns prompt.
 * Explicit {{variable}} substitution only — no dynamic prompt generation.
 */

import { createHash } from "node:crypto";

import {
  AiAdapterError,
  type LoadedPrompt,
} from "@/lib/ai/ai-adapter-types";
import { REGISTERED_PROMPTS } from "@/lib/ai/registered-prompts";

export function loadPrompt(
  promptId: string,
  expectedVersion: number,
): LoadedPrompt {
  const entry = REGISTERED_PROMPTS[promptId];
  if (!entry) {
    throw new AiAdapterError(
      "prompt_not_found",
      `No registered prompt for prompt_id=${promptId}`,
    );
  }

  if (entry.promptId !== promptId) {
    throw new AiAdapterError(
      "prompt_id_mismatch",
      `Expected prompt_id=${promptId}, registry declares ${entry.promptId}.`,
    );
  }

  if (entry.version !== expectedVersion) {
    throw new AiAdapterError(
      "prompt_version_mismatch",
      `Expected version ${expectedVersion} for ${promptId}, registry has ${entry.version}.`,
    );
  }

  if (!entry.body.trim()) {
    throw new AiAdapterError(
      "prompt_body_empty",
      `Prompt ${promptId} v${expectedVersion} has an empty body.`,
    );
  }

  return {
    promptId,
    version: expectedVersion,
    body: entry.body.trim(),
    sourcePath: `registered:${promptId}@v${expectedVersion}`,
  };
}

/**
 * Replace {{key}} tokens from an explicit map only.
 * Missing required tokens fail loud.
 */
export function substitutePromptVariables(
  body: string,
  variables: Record<string, string>,
): string {
  const required = new Set<string>();
  const tokenRe = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = tokenRe.exec(body)) !== null) {
    required.add(match[1] ?? "");
  }

  for (const key of required) {
    if (!(key in variables)) {
      throw new AiAdapterError(
        "prompt_variable_missing",
        `Prompt requires {{${key}}} but task did not supply it.`,
      );
    }
  }

  return body.replace(tokenRe, (_full, key: string) => variables[key] ?? "");
}

export function hashPromptBody(body: string): string {
  return createHash("sha256").update(body).digest("hex").slice(0, 16);
}
