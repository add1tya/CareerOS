/**
 * Career Gap Analysis service (ADR-0025).
 *
 * Presentation-only reports. Never writes Career Graph / Evidence / Mastery /
 * Goals / Planning / Recommendations.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { AI_ADAPTER_VERSION } from "@/lib/ai/ai-adapter-types";
import { runAiTaskPersisted } from "@/lib/ai/ai-adapter-service";
import {
  buildCareerGapAnalysisInput,
  CAREER_GAP_ANALYSIS_PROMPT_ID,
  CAREER_GAP_ANALYSIS_PROMPT_VERSION,
  careerGapAnalysisTask,
} from "@/lib/ai/tasks/career-gap-analysis";
import { buildGapFacts } from "@/lib/gap-analysis/gap-facts";
import { buildGapReport } from "@/lib/gap-analysis/gap-report";
import { buildGapSections } from "@/lib/gap-analysis/gap-sections";
import { buildGapView } from "@/lib/gap-analysis/gap-view";
import {
  GAP_ANALYSIS_VERSION,
  type GapFacts,
  type GapReport,
  type GapSections,
  type GapView,
} from "@/lib/gap-analysis/gap-analysis-types";

export async function previewGapFacts(
  supabase: SupabaseClient,
  userId: string,
): Promise<GapView> {
  const facts = await buildGapFacts(supabase, userId);
  if (!facts.sufficient) {
    return buildGapView({
      status: "insufficient",
      insufficientReason: facts.insufficientReason,
      facts,
      sections: buildGapSections(facts),
    });
  }
  return buildGapView({
    status: "missing",
    facts,
    sections: buildGapSections(facts),
  });
}

export async function composeGapAnalysis(
  supabase: SupabaseClient,
  userId: string,
  options?: { signal?: AbortSignal },
): Promise<GapView> {
  const facts = await buildGapFacts(supabase, userId);
  const sections = buildGapSections(facts);

  if (!facts.sufficient) {
    return buildGapView({
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
    return buildGapView({
      status: "insufficient",
      insufficientReason:
        "No includable gap sections from verified facts — AI was not called.",
      facts,
      sections,
    });
  }

  const input = buildCareerGapAnalysisInput(
    JSON.stringify(facts),
    JSON.stringify(sections),
  );

  const aiResult = await runAiTaskPersisted(
    supabase,
    userId,
    careerGapAnalysisTask,
    input,
    options,
  );

  const filteredOutput = {
    sections: aiResult.output.sections.filter((s) =>
      includeKeys.includes(s.key),
    ),
    uncertaintyNote: aiResult.output.uncertaintyNote ?? null,
  };

  const generatedAt = new Date().toISOString();
  const report = buildGapReport(filteredOutput, facts, sections, generatedAt);
  const factsHash = report.metadata.factsHash;

  const { data, error } = await supabase
    .from("career_gap_reports")
    .insert({
      user_id: userId,
      report,
      gap_facts: facts,
      gap_sections: sections,
      gap_facts_hash: factsHash,
      generated_at: generatedAt,
      goal_title: facts.goal.title,
      goal_status: facts.goal.status,
      goal_deadline: facts.goal.deadline,
      ai_invocation_id: aiResult.provenance.invocationId,
      gap_analysis_version: GAP_ANALYSIS_VERSION,
      prompt_id: CAREER_GAP_ANALYSIS_PROMPT_ID,
      prompt_version: CAREER_GAP_ANALYSIS_PROMPT_VERSION,
      adapter_version: AI_ADAPTER_VERSION,
    })
    .select("id, created_at, report")
    .single();

  if (error) {
    throw new Error(`Failed to store gap report: ${error.message}`);
  }

  return buildGapView({
    status: "ready",
    facts,
    sections,
    report: data.report as GapReport,
    reportId: data.id as string,
    createdAt: data.created_at as string,
  });
}

export async function listGapReports(
  supabase: SupabaseClient,
  userId: string,
): Promise<
  Array<{
    id: string;
    createdAt: string;
    generatedAt: string;
    gapAnalysisVersion: number;
    goalTitle: string | null;
  }>
> {
  const { data, error } = await supabase
    .from("career_gap_reports")
    .select(
      "id, created_at, generated_at, gap_analysis_version, goal_title",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(`Failed to list gap reports: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    createdAt: row.created_at as string,
    generatedAt: row.generated_at as string,
    gapAnalysisVersion: row.gap_analysis_version as number,
    goalTitle: (row.goal_title as string | null) ?? null,
  }));
}

export async function getGapReport(
  supabase: SupabaseClient,
  userId: string,
  reportId: string,
): Promise<GapView> {
  const { data, error } = await supabase
    .from("career_gap_reports")
    .select("*")
    .eq("id", reportId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load gap report: ${error.message}`);
  }
  if (!data) {
    return buildGapView({
      status: "missing",
      insufficientReason: "Report not found.",
    });
  }

  return buildGapView({
    status: "ready",
    facts: data.gap_facts as GapFacts,
    sections: data.gap_sections as GapSections,
    report: data.report as GapReport,
    reportId: data.id as string,
    createdAt: data.created_at as string,
  });
}
