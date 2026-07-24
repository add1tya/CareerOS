/**
 * Decision Trace Narrator service (ADR-0023).
 *
 * Presentation-only. Never writes ranking / factors / Evidence / Mastery.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { AI_ADAPTER_VERSION } from "@/lib/ai/ai-adapter-types";
import { runAiTaskPersisted } from "@/lib/ai/ai-adapter-service";
import {
  buildTraceNarrateInput,
  TRACE_NARRATE_PROMPT_ID,
  TRACE_NARRATE_PROMPT_VERSION,
  traceNarrateTask,
} from "@/lib/ai/tasks/trace-narrate";
import { explainFromPersistedFactors } from "@/lib/decision-engine/decision-explanation";
import { buildNarrativeFacts } from "@/lib/decision-engine/narrative-facts";
import { buildNarrativeView } from "@/lib/decision-engine/narrative-view";
import { buildTraceFacts, hashTraceFacts } from "@/lib/decision-engine/trace-facts";
import {
  TRACE_NARRATOR_VERSION,
  type NarrativeFacts,
  type NarrativeView,
} from "@/lib/decision-engine/trace-narrator-types";

export async function getDecisionTraceNarrative(
  supabase: SupabaseClient,
  userId: string,
  recommendationId: string,
): Promise<NarrativeView> {
  const row = await loadStoredNarrative(
    supabase,
    userId,
    recommendationId,
    TRACE_NARRATOR_VERSION,
  );
  if (row) {
    return buildNarrativeView({
      recommendationId,
      status: "ready",
      narrative: row.narrative,
      createdAt: row.createdAt,
    });
  }

  // Check whether we could generate (for insufficient messaging without calling AI).
  const loaded = await loadRecommendationTrace(supabase, userId, recommendationId);
  if (!loaded) {
    return buildNarrativeView({
      recommendationId,
      status: "missing",
      insufficientReason: "Recommendation not found.",
    });
  }

  const traceFacts = buildTraceFacts({
    recommendationId,
    rawFactors: loaded.factors,
    goalTitle: loaded.goalTitle,
    explanation: loaded.explanation,
  });

  if (!traceFacts.sufficient) {
    return buildNarrativeView({
      recommendationId,
      status: "insufficient",
      insufficientReason: traceFacts.insufficientReason,
    });
  }

  return buildNarrativeView({
    recommendationId,
    status: "missing",
    insufficientReason: null,
  });
}

/**
 * Generate (or return existing) narrative for TRACE_NARRATOR_VERSION.
 * Skips AI when Trace Facts are insufficient.
 */
export async function narrateDecisionTrace(
  supabase: SupabaseClient,
  userId: string,
  recommendationId: string,
  options?: { signal?: AbortSignal },
): Promise<NarrativeView> {
  const existing = await loadStoredNarrative(
    supabase,
    userId,
    recommendationId,
    TRACE_NARRATOR_VERSION,
  );
  if (existing) {
    return buildNarrativeView({
      recommendationId,
      status: "ready",
      narrative: existing.narrative,
      createdAt: existing.createdAt,
    });
  }

  const loaded = await loadRecommendationTrace(supabase, userId, recommendationId);
  if (!loaded) {
    return buildNarrativeView({
      recommendationId,
      status: "missing",
      insufficientReason: "Recommendation not found.",
    });
  }

  const traceFacts = buildTraceFacts({
    recommendationId,
    rawFactors: loaded.factors,
    goalTitle: loaded.goalTitle,
    explanation: loaded.explanation,
  });

  if (!traceFacts.sufficient) {
    return buildNarrativeView({
      recommendationId,
      status: "insufficient",
      insufficientReason: traceFacts.insufficientReason,
    });
  }

  const factsHash = hashTraceFacts(traceFacts);
  const input = buildTraceNarrateInput(JSON.stringify(traceFacts));
  const aiResult = await runAiTaskPersisted(
    supabase,
    userId,
    traceNarrateTask,
    input,
    options,
  );

  const narrativeFacts = buildNarrativeFacts(aiResult.output, traceFacts);

  const { data, error } = await supabase
    .from("decision_trace_narratives")
    .insert({
      user_id: userId,
      recommendation_id: recommendationId,
      narrative: narrativeFacts,
      trace_facts_hash: factsHash,
      ai_invocation_id: aiResult.provenance.invocationId,
      trace_narrator_version: TRACE_NARRATOR_VERSION,
      decision_explanation_version: narrativeFacts.decisionExplanationVersion,
      prompt_id: TRACE_NARRATE_PROMPT_ID,
      prompt_version: TRACE_NARRATE_PROMPT_VERSION,
      adapter_version: AI_ADAPTER_VERSION,
    })
    .select("id, created_at, narrative")
    .single();

  if (error) {
    // Concurrent insert for same version — load existing.
    if (error.code === "23505") {
      const again = await loadStoredNarrative(
        supabase,
        userId,
        recommendationId,
        TRACE_NARRATOR_VERSION,
      );
      if (again) {
        return buildNarrativeView({
          recommendationId,
          status: "ready",
          narrative: again.narrative,
          createdAt: again.createdAt,
        });
      }
    }
    throw new Error(`Failed to store narrative: ${error.message}`);
  }

  return buildNarrativeView({
    recommendationId,
    status: "ready",
    narrative: data.narrative as NarrativeFacts,
    createdAt: data.created_at as string,
  });
}

async function loadRecommendationTrace(
  supabase: SupabaseClient,
  userId: string,
  recommendationId: string,
): Promise<{
  factors: unknown;
  goalTitle: string | null;
  explanation: ReturnType<typeof explainFromPersistedFactors>;
} | null> {
  const { data, error } = await supabase
    .from("skill_recommendations")
    .select("id, factors, goal_id")
    .eq("id", recommendationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load recommendation: ${error.message}`);
  }
  if (!data) return null;

  let goalTitle: string | null = null;
  if (data.goal_id) {
    const { data: goal, error: goalError } = await supabase
      .from("goals")
      .select("title")
      .eq("id", data.goal_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (goalError) {
      throw new Error(`Failed to load goal for narration: ${goalError.message}`);
    }
    goalTitle = (goal?.title as string | undefined) ?? null;
  }

  const explanation = explainFromPersistedFactors(data.factors, goalTitle);
  return {
    factors: data.factors,
    goalTitle,
    explanation,
  };
}

async function loadStoredNarrative(
  supabase: SupabaseClient,
  userId: string,
  recommendationId: string,
  narratorVersion: number,
): Promise<{ narrative: NarrativeFacts; createdAt: string } | null> {
  const { data, error } = await supabase
    .from("decision_trace_narratives")
    .select("narrative, created_at")
    .eq("user_id", userId)
    .eq("recommendation_id", recommendationId)
    .eq("trace_narrator_version", narratorVersion)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load narrative: ${error.message}`);
  }
  if (!data) return null;
  return {
    narrative: data.narrative as NarrativeFacts,
    createdAt: data.created_at as string,
  };
}
