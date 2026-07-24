/**
 * Portfolio Draft — grounding + order validation (ADR-0028).
 *
 * Renderer owns section order. Featured projects and learning journey must
 * match Facts stable ids and order — AI never chooses or reorders them.
 */

import type { PortfolioComposeOutput } from "@/lib/ai/tasks/portfolio-compose";
import { hashPortfolioFacts } from "@/lib/portfolio-intelligence/portfolio-facts";
import {
  PORTFOLIO_INTELLIGENCE_VERSION,
  PORTFOLIO_SECTION_KEYS,
  type PortfolioDraft,
  type PortfolioDraftSection,
  type PortfolioDraftSectionItem,
  type PortfolioFacts,
  type PortfolioSections,
} from "@/lib/portfolio-intelligence/portfolio-intelligence-types";

const ORDERED_SECTION_KEYS = new Set<string>([
  "featuredProjects",
  "learningJourney",
]);

export function buildPortfolioDraft(
  raw: PortfolioComposeOutput,
  facts: PortfolioFacts,
  sections: PortfolioSections,
  generatedAt: string = new Date().toISOString(),
): PortfolioDraft {
  const atomIds = new Set(facts.atoms.map((a) => a.id));
  const planByKey = new Map(sections.sections.map((s) => [s.key, s]));
  const rawByKey = new Map(raw.sections.map((s) => [s.key, s]));
  const draftSections: PortfolioDraftSection[] = [];

  for (const key of PORTFOLIO_SECTION_KEYS) {
    const plan = planByKey.get(key);
    if (!plan || plan.status === "omit") {
      draftSections.push({
        key,
        status: "omitted",
        items: [],
        unavailableMessage: null,
      });
      continue;
    }

    if (plan.status === "unavailable") {
      draftSections.push({
        key,
        status: "unavailable",
        items: [],
        unavailableMessage:
          plan.unavailableMessage ??
          "Verified information unavailable in CareerOS.",
      });
      continue;
    }

    const rawSection = rawByKey.get(key);
    if (!rawSection) {
      throw new Error(`Portfolio compose output missing section: ${key}`);
    }

    const items: PortfolioDraftSectionItem[] = [];
    for (const item of rawSection.items) {
      const text = item.text.trim();
      if (!text) continue;
      const citationIds = [...new Set(item.citationIds)];
      if (citationIds.length === 0) {
        throw new Error(`Section ${key} item missing citations.`);
      }
      for (const id of citationIds) {
        if (!atomIds.has(id)) {
          throw new Error(
            `Section ${key} cites unknown Portfolio Fact atom "${id}".`,
          );
        }
        if (!plan.atomIds.includes(id)) {
          throw new Error(
            `Section ${key} cites atom "${id}" not assigned to this section plan.`,
          );
        }
      }

      const stableId = item.stableId?.trim() || null;
      if (ORDERED_SECTION_KEYS.has(key)) {
        if (!stableId) {
          throw new Error(
            `Section ${key} item missing stableId (required for ordered proof sections).`,
          );
        }
        if (!plan.atomIds.includes(stableId)) {
          throw new Error(
            `Section ${key} stableId "${stableId}" is not in the deterministic section plan.`,
          );
        }
      }

      items.push({ text, citationIds, stableId });
    }

    if (items.length === 0) {
      throw new Error(`Section ${key} composed with no items.`);
    }

    if (ORDERED_SECTION_KEYS.has(key)) {
      assertStableOrder(key, items, plan.atomIds);
    }

    draftSections.push({
      key,
      status: "composed",
      items,
      unavailableMessage: null,
    });
  }

  return {
    metadata: {
      generatedAt,
      goal: { ...facts.goal },
      portfolioIntelligenceVersion: PORTFOLIO_INTELLIGENCE_VERSION,
      evidenceCount: facts.evidenceCount,
      factsHash: hashPortfolioFacts(facts),
    },
    sections: draftSections,
  };
}

function assertStableOrder(
  key: string,
  items: PortfolioDraftSectionItem[],
  plannedIds: string[],
): void {
  const itemIds = items.map((i) => i.stableId!);
  // Every planned id must appear exactly once, in order; AI may not drop/reorder.
  if (itemIds.length !== plannedIds.length) {
    throw new Error(
      `Section ${key}: expected ${plannedIds.length} ordered items, got ${itemIds.length}. AI must not choose or drop featured/timeline entries.`,
    );
  }
  for (let i = 0; i < plannedIds.length; i++) {
    if (itemIds[i] !== plannedIds[i]) {
      throw new Error(
        `Section ${key}: order mismatch at index ${i}. Expected stableId "${plannedIds[i]}", got "${itemIds[i]}". AI must not reorder.`,
      );
    }
  }
}
