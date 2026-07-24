/**
 * Narrative Facts — deterministic grounding after AI output (ADR-0023).
 *
 * Validates that each section cites Trace Fact atoms that exist.
 * Does not invent atoms or change recommendations.
 */

import type { TraceNarrateOutput } from "@/lib/ai/tasks/trace-narrate";
import {
  NARRATIVE_SECTION_KEYS,
  TRACE_NARRATOR_VERSION,
  type NarrativeFacts,
  type NarrativeSectionFact,
  type TraceFacts,
} from "@/lib/decision-engine/trace-narrator-types";

export function buildNarrativeFacts(
  raw: TraceNarrateOutput,
  traceFacts: TraceFacts,
): NarrativeFacts {
  if (!traceFacts.sufficient) {
    throw new Error("Cannot build Narrative Facts from insufficient Trace Facts.");
  }

  const atomIds = new Set(traceFacts.atoms.map((a) => a.id));
  const sections: NarrativeSectionFact[] = [];

  for (const key of NARRATIVE_SECTION_KEYS) {
    const section = raw.sections.find((s) => s.key === key);
    if (!section) {
      throw new Error(`Narrative missing required section: ${key}`);
    }
    const prose = section.prose.trim();
    if (!prose) {
      throw new Error(`Narrative section ${key} has empty prose.`);
    }
    const citationIds = [...new Set(section.citationIds)];
    if (citationIds.length === 0) {
      throw new Error(`Narrative section ${key} must cite at least one Trace Fact atom.`);
    }
    for (const id of citationIds) {
      if (!atomIds.has(id)) {
        throw new Error(
          `Narrative section ${key} cites unknown Trace Fact atom "${id}".`,
        );
      }
    }
    sections.push({ key, prose, citationIds });
  }

  return {
    traceNarratorVersion: TRACE_NARRATOR_VERSION,
    decisionExplanationVersion: traceFacts.decisionExplanationVersion ?? 1,
    sections,
    uncertaintyNote: raw.uncertaintyNote?.trim()
      ? raw.uncertaintyNote.trim()
      : null,
  };
}
