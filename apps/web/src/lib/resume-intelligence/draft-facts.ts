/**
 * Draft Facts — grounding validation after AI compose (ADR-0024).
 */

import type { ResumeComposeOutput } from "@/lib/ai/tasks/resume-compose";
import {
  RESUME_INTELLIGENCE_VERSION,
  RESUME_SECTION_KEYS,
  type ResumeDraft,
  type ResumeDraftSection,
  type ResumeFacts,
  type ResumeSections,
} from "@/lib/resume-intelligence/resume-intelligence-types";

export function buildResumeDraft(
  raw: ResumeComposeOutput,
  facts: ResumeFacts,
  sections: ResumeSections,
): ResumeDraft {
  const atomIds = new Set(facts.atoms.map((a) => a.id));
  const planByKey = new Map(sections.sections.map((s) => [s.key, s]));
  const draftSections: ResumeDraftSection[] = [];

  for (const key of RESUME_SECTION_KEYS) {
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

    const rawSection = raw.sections.find((s) => s.key === key);
    if (!rawSection) {
      throw new Error(`Compose output missing section: ${key}`);
    }

    const items = [];
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
            `Section ${key} cites unknown Resume Fact atom "${id}".`,
          );
        }
        if (!plan.atomIds.includes(id)) {
          throw new Error(
            `Section ${key} cites atom "${id}" not assigned to this section plan.`,
          );
        }
      }
      items.push({ text, citationIds });
    }

    if (items.length === 0) {
      throw new Error(`Section ${key} composed with no items.`);
    }

    draftSections.push({
      key,
      status: "composed",
      items,
      unavailableMessage: null,
    });
  }

  return {
    resumeIntelligenceVersion: RESUME_INTELLIGENCE_VERSION,
    sections: draftSections,
  };
}
