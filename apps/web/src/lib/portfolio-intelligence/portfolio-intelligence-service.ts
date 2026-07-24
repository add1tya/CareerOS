/**
 * Portfolio Intelligence service (ADR-0028).
 *
 * Presentation-only drafts. Never writes Career Graph / Evidence / Mastery /
 * Goals / Planning / Recommendations / resume_drafts / career_gap_reports.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { AI_ADAPTER_VERSION } from "@/lib/ai/ai-adapter-types";
import { runAiTaskPersisted } from "@/lib/ai/ai-adapter-service";
import {
  buildPortfolioComposeInput,
  PORTFOLIO_COMPOSE_PROMPT_ID,
  PORTFOLIO_COMPOSE_PROMPT_VERSION,
  portfolioComposeTask,
} from "@/lib/ai/tasks/portfolio-compose";
import { buildPortfolioDraft } from "@/lib/portfolio-intelligence/portfolio-draft";
import {
  buildPortfolioFacts,
  hashPortfolioFacts,
} from "@/lib/portfolio-intelligence/portfolio-facts";
import { buildPortfolioSections } from "@/lib/portfolio-intelligence/portfolio-sections";
import { buildPortfolioView } from "@/lib/portfolio-intelligence/portfolio-view";
import {
  PORTFOLIO_INTELLIGENCE_VERSION,
  type PortfolioDraft,
  type PortfolioFacts,
  type PortfolioSections,
  type PortfolioView,
} from "@/lib/portfolio-intelligence/portfolio-intelligence-types";

export async function previewPortfolioFacts(
  supabase: SupabaseClient,
  userId: string,
): Promise<PortfolioView> {
  const facts = await buildPortfolioFacts(supabase, userId);
  if (!facts.sufficient) {
    return buildPortfolioView({
      status: "insufficient",
      insufficientReason: facts.insufficientReason,
      facts,
      sections: buildPortfolioSections(facts),
    });
  }
  return buildPortfolioView({
    status: "missing",
    facts,
    sections: buildPortfolioSections(facts),
  });
}

export async function composePortfolioDraft(
  supabase: SupabaseClient,
  userId: string,
  options?: { signal?: AbortSignal },
): Promise<PortfolioView> {
  const facts = await buildPortfolioFacts(supabase, userId);
  const sections = buildPortfolioSections(facts);

  if (!facts.sufficient) {
    return buildPortfolioView({
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
    return buildPortfolioView({
      status: "insufficient",
      insufficientReason:
        "No includable portfolio sections from verified facts — AI was not called.",
      facts,
      sections,
    });
  }

  const input = buildPortfolioComposeInput(
    JSON.stringify(facts),
    JSON.stringify(sections),
  );

  const aiResult = await runAiTaskPersisted(
    supabase,
    userId,
    portfolioComposeTask,
    input,
    options,
  );

  const filteredOutput = {
    sections: aiResult.output.sections.filter((s) =>
      includeKeys.includes(s.key),
    ),
  };

  const generatedAt = new Date().toISOString();
  const draft = buildPortfolioDraft(
    filteredOutput,
    facts,
    sections,
    generatedAt,
  );
  const factsHash = draft.metadata.factsHash;

  const { data, error } = await supabase
    .from("portfolio_drafts")
    .insert({
      user_id: userId,
      draft,
      portfolio_facts: facts,
      portfolio_sections: sections,
      portfolio_facts_hash: factsHash,
      generated_at: generatedAt,
      goal_title: facts.goal.title,
      goal_status: facts.goal.status,
      goal_deadline: facts.goal.deadline,
      evidence_count: facts.evidenceCount,
      ai_invocation_id: aiResult.provenance.invocationId,
      portfolio_intelligence_version: PORTFOLIO_INTELLIGENCE_VERSION,
      prompt_id: PORTFOLIO_COMPOSE_PROMPT_ID,
      prompt_version: PORTFOLIO_COMPOSE_PROMPT_VERSION,
      adapter_version: AI_ADAPTER_VERSION,
    })
    .select("id, created_at, draft")
    .single();

  if (error) {
    throw new Error(`Failed to store portfolio draft: ${error.message}`);
  }

  return buildPortfolioView({
    status: "ready",
    facts,
    sections,
    draft: data.draft as PortfolioDraft,
    draftId: data.id as string,
    createdAt: data.created_at as string,
  });
}

export async function listPortfolioDrafts(
  supabase: SupabaseClient,
  userId: string,
): Promise<
  Array<{
    id: string;
    createdAt: string;
    generatedAt: string;
    portfolioIntelligenceVersion: number;
    evidenceCount: number;
    goalTitle: string | null;
  }>
> {
  const { data, error } = await supabase
    .from("portfolio_drafts")
    .select(
      "id, created_at, generated_at, portfolio_intelligence_version, evidence_count, goal_title",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(`Failed to list portfolio drafts: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    createdAt: row.created_at as string,
    generatedAt: row.generated_at as string,
    portfolioIntelligenceVersion: row.portfolio_intelligence_version as number,
    evidenceCount: row.evidence_count as number,
    goalTitle: (row.goal_title as string | null) ?? null,
  }));
}

export async function getPortfolioDraft(
  supabase: SupabaseClient,
  userId: string,
  draftId: string,
): Promise<PortfolioView> {
  const { data, error } = await supabase
    .from("portfolio_drafts")
    .select("*")
    .eq("id", draftId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load portfolio draft: ${error.message}`);
  }
  if (!data) {
    return buildPortfolioView({
      status: "missing",
      insufficientReason: "Draft not found.",
    });
  }

  return buildPortfolioView({
    status: "ready",
    facts: data.portfolio_facts as PortfolioFacts,
    sections: data.portfolio_sections as PortfolioSections,
    draft: data.draft as PortfolioDraft,
    draftId: data.id as string,
    createdAt: data.created_at as string,
  });
}

export { hashPortfolioFacts };
