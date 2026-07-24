/**
 * Gap Sections — deterministic organization of Gap Facts (ADR-0025).
 *
 * Missing and Weak stay on separate sections. No LLM.
 */

import type {
  GapFactAtom,
  GapFacts,
  GapSectionKey,
  GapSectionPlan,
  GapSections,
} from "@/lib/gap-analysis/gap-analysis-types";

export function buildGapSections(facts: GapFacts): GapSections {
  const byKind = (kind: GapFactAtom["kind"]) =>
    facts.atoms.filter((a) => a.kind === kind);
  const real = (atoms: GapFactAtom[], absentId: string) =>
    atoms.filter((a) => a.id !== absentId);

  const strengths = real(byKind("strength"), "strengths.absent");
  const missing = real(byKind("missing"), "missing.absent");
  const weak = real(byKind("weak"), "weak.absent");
  const roadmap = real(byKind("roadmap"), "roadmap.empty");
  const blocks = byKind("block");
  const confidence = real(byKind("confidence"), "confidence.absent");
  const goal = byKind("goal").filter((a) => a.id !== "goal.absent");
  const progress = byKind("progress");
  const focus = byKind("focus").filter((a) => a.id !== "focus.unavailable");
  const limits = byKind("limits");

  const sections: GapSectionPlan[] = [
    plan(
      "overview",
      [...goal, ...progress, ...focus, ...limits.slice(0, 1)],
      "Verified overview facts unavailable",
    ),
    plan(
      "strengths",
      strengths,
      "No verified high-mastery strengths on record",
    ),
    plan(
      "missing",
      missing,
      "No unlocked skills without Evidence on record",
    ),
    plan(
      "weaknesses",
      weak,
      "No unlocked skills with Evidence and low mastery on record",
    ),
    plan(
      "roadmapGaps",
      [...roadmap.filter((a) => !a.value.includes("kind=completed")), ...blocks],
      "No remaining roadmap gap atoms on record",
    ),
    plan(
      "confidenceGaps",
      confidence,
      "No mastery/confidence mismatch atoms on record",
    ),
    {
      key: "measurementLimits",
      status: "include",
      atomIds: limits.map((a) => a.id),
      unavailableMessage: null,
    },
  ];

  return { sections };
}

function plan(
  key: GapSectionKey,
  atoms: GapFactAtom[],
  unavailableMessage: string,
): GapSectionPlan {
  if (atoms.length === 0) {
    return {
      key,
      status: "unavailable",
      atomIds: [],
      unavailableMessage,
    };
  }
  return {
    key,
    status: "include",
    atomIds: atoms.map((a) => a.id),
    unavailableMessage: null,
  };
}
