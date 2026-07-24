/**
 * Resume Intelligence service (ADR-0024).
 *
 * Presentation-only drafts. Never writes Career Graph / Evidence / Mastery /
 * Goals / Planning / Recommendations.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { AI_ADAPTER_VERSION } from "@/lib/ai/ai-adapter-types";
import { runAiTaskPersisted } from "@/lib/ai/ai-adapter-service";
import {
  buildResumeComposeInput,
  RESUME_COMPOSE_PROMPT_ID,
  RESUME_COMPOSE_PROMPT_VERSION,
  resumeComposeTask,
} from "@/lib/ai/tasks/resume-compose";
import { buildResumeDraft } from "@/lib/resume-intelligence/draft-facts";
import { buildResumeView } from "@/lib/resume-intelligence/draft-view";
import {
  buildResumeFacts,
  hashResumeFacts,
} from "@/lib/resume-intelligence/resume-facts";
import { buildResumeSections } from "@/lib/resume-intelligence/resume-sections";
import {
  RESUME_INTELLIGENCE_VERSION,
  type ResumeDraft,
  type ResumeFacts,
  type ResumeSections,
  type ResumeView,
} from "@/lib/resume-intelligence/resume-intelligence-types";

export async function previewResumeFacts(
  supabase: SupabaseClient,
  userId: string,
): Promise<ResumeView> {
  const facts = await buildResumeFacts(supabase, userId);
  if (!facts.sufficient) {
    return buildResumeView({
      status: "insufficient",
      insufficientReason: facts.insufficientReason,
      facts,
      sections: buildResumeSections(facts),
    });
  }
  return buildResumeView({
    status: "missing",
    facts,
    sections: buildResumeSections(facts),
  });
}

export async function composeResumeDraft(
  supabase: SupabaseClient,
  userId: string,
  options?: { signal?: AbortSignal },
): Promise<ResumeView> {
  const facts = await buildResumeFacts(supabase, userId);
  const sections = buildResumeSections(facts);

  if (!facts.sufficient) {
    return buildResumeView({
      status: "insufficient",
      insufficientReason: facts.insufficientReason,
      facts,
      sections,
    });
  }

  const includeKeys = sections.sections
    .filter((s) => s.status === "include")
    .map((s) => s.key);

  if (includeKeys.length === 0) {
    return buildResumeView({
      status: "insufficient",
      insufficientReason:
        "No includable resume sections from verified facts — AI was not called.",
      facts,
      sections,
    });
  }

  const factsJson = JSON.stringify(facts);
  const sectionsJson = JSON.stringify(sections);
  const input = buildResumeComposeInput(factsJson, sectionsJson);

  const aiResult = await runAiTaskPersisted(
    supabase,
    userId,
    resumeComposeTask,
    input,
    options,
  );

  // Only validate/compose sections that were planned as include; merge unavailable.
  const filteredOutput = {
    sections: aiResult.output.sections.filter((s) =>
      includeKeys.includes(s.key),
    ),
  };

  const draft = buildResumeDraft(filteredOutput, facts, sections);
  const factsHash = hashResumeFacts(facts);

  const { data, error } = await supabase
    .from("resume_drafts")
    .insert({
      user_id: userId,
      draft,
      resume_facts: facts,
      resume_sections: sections,
      resume_facts_hash: factsHash,
      ai_invocation_id: aiResult.provenance.invocationId,
      resume_intelligence_version: RESUME_INTELLIGENCE_VERSION,
      prompt_id: RESUME_COMPOSE_PROMPT_ID,
      prompt_version: RESUME_COMPOSE_PROMPT_VERSION,
      adapter_version: AI_ADAPTER_VERSION,
    })
    .select("id, created_at, draft")
    .single();

  if (error) {
    throw new Error(`Failed to store resume draft: ${error.message}`);
  }

  return buildResumeView({
    status: "ready",
    facts,
    sections,
    draft: data.draft as ResumeDraft,
    draftId: data.id as string,
    createdAt: data.created_at as string,
  });
}

export async function listResumeDrafts(
  supabase: SupabaseClient,
  userId: string,
): Promise<
  Array<{ id: string; createdAt: string; resumeIntelligenceVersion: number }>
> {
  const { data, error } = await supabase
    .from("resume_drafts")
    .select("id, created_at, resume_intelligence_version")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(`Failed to list resume drafts: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    createdAt: row.created_at as string,
    resumeIntelligenceVersion: row.resume_intelligence_version as number,
  }));
}

export async function getResumeDraft(
  supabase: SupabaseClient,
  userId: string,
  draftId: string,
): Promise<ResumeView> {
  const { data, error } = await supabase
    .from("resume_drafts")
    .select("*")
    .eq("id", draftId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load resume draft: ${error.message}`);
  }
  if (!data) {
    return buildResumeView({
      status: "missing",
      insufficientReason: "Draft not found.",
    });
  }

  return buildResumeView({
    status: "ready",
    facts: data.resume_facts as ResumeFacts,
    sections: data.resume_sections as ResumeSections,
    draft: data.draft as ResumeDraft,
    draftId: data.id as string,
    createdAt: data.created_at as string,
  });
}
