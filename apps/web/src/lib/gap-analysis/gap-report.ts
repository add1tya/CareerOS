/**
 * Gap Report — grounding validation + stable section order (ADR-0025).
 *
 * Renderer owns order via GAP_SECTION_KEYS. AI never determines layout.
 */

import { AI_ADAPTER_VERSION } from "@/lib/ai/ai-adapter-types";
import type { CareerGapAnalysisOutput } from "@/lib/ai/tasks/career-gap-analysis";
import { CAREER_GAP_ANALYSIS_PROMPT_VERSION } from "@/lib/ai/tasks/career-gap-analysis";
import {
  GAP_ANALYSIS_VERSION,
  GAP_SECTION_KEYS,
  type GapFacts,
  type GapReport,
  type GapReportSection,
  type GapSections,
} from "@/lib/gap-analysis/gap-analysis-types";
import { hashGapFacts } from "@/lib/gap-analysis/gap-facts";

export function buildGapReport(
  raw: CareerGapAnalysisOutput,
  facts: GapFacts,
  sections: GapSections,
  generatedAt: string = new Date().toISOString(),
): GapReport {
  const atomIds = new Set(facts.atoms.map((a) => a.id));
  const planByKey = new Map(sections.sections.map((s) => [s.key, s]));
  const rawByKey = new Map(raw.sections.map((s) => [s.key, s]));
  const reportSections: GapReportSection[] = [];

  // Stable order — ignore AI array order.
  for (const key of GAP_SECTION_KEYS) {
    const plan = planByKey.get(key);
    if (!plan || plan.status === "omit") {
      reportSections.push({
        key,
        status: "omitted",
        prose: null,
        citationIds: [],
        unavailableMessage: null,
      });
      continue;
    }

    if (plan.status === "unavailable") {
      reportSections.push({
        key,
        status: "unavailable",
        prose: null,
        citationIds: [],
        unavailableMessage:
          plan.unavailableMessage ??
          "Verified information unavailable in CareerOS.",
      });
      continue;
    }

    const rawSection = rawByKey.get(key);
    if (!rawSection) {
      throw new Error(`Gap analysis output missing section: ${key}`);
    }

    const prose = rawSection.prose.trim();
    if (!prose) {
      throw new Error(`Section ${key} composed with empty prose.`);
    }

    const citationIds = [...new Set(rawSection.citationIds)];
    if (citationIds.length === 0) {
      throw new Error(`Section ${key} missing citations.`);
    }
    for (const id of citationIds) {
      if (!atomIds.has(id)) {
        throw new Error(
          `Section ${key} cites unknown Gap Fact atom "${id}".`,
        );
      }
      if (!plan.atomIds.includes(id)) {
        throw new Error(
          `Section ${key} cites atom "${id}" not assigned to this section plan.`,
        );
      }
    }

    reportSections.push({
      key,
      status: "composed",
      prose,
      citationIds,
      unavailableMessage: null,
    });
  }

  return {
    metadata: {
      generatedAt,
      goal: { ...facts.goal },
      gapAnalysisVersion: GAP_ANALYSIS_VERSION,
      promptVersion: CAREER_GAP_ANALYSIS_PROMPT_VERSION,
      adapterVersion: AI_ADAPTER_VERSION,
      factsHash: hashGapFacts(facts),
    },
    sections: reportSections,
  };
}
