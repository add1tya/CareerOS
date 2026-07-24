/**
 * Resume Sections — deterministic organization of Resume Facts (ADR-0024).
 *
 * No LLM. Honest omissions: omit or unavailable — never invent experience.
 */

import type {
  ResumeFactAtom,
  ResumeFacts,
  ResumeSectionKey,
  ResumeSectionPlan,
  ResumeSections,
} from "@/lib/resume-intelligence/resume-intelligence-types";

export function buildResumeSections(facts: ResumeFacts): ResumeSections {
  const byKind = (kind: string) => facts.atoms.filter((a) => a.kind === kind);
  const ids = (atoms: ResumeFactAtom[]) => atoms.map((a) => a.id);

  const profile = byKind("profile");
  const goal = byKind("goal").filter((a) => a.id !== "goal.absent");
  const skills = byKind("skill").filter((a) => a.id !== "skills.absent");
  const evidence = byKind("evidence").filter(
    (a) => a.id !== "experience.unavailable",
  );
  const focus = byKind("focus").filter((a) => a.id !== "focus.unavailable");
  const progress = byKind("progress");

  const sections: ResumeSectionPlan[] = [
    plan(
      "headline",
      [...profile.filter((a) => a.id.includes("target_role") || a.id.includes("display_name")), ...goal],
      "Verified headline facts unavailable",
    ),
    plan(
      "summary",
      [...profile, ...goal, ...progress, ...focus],
      "Verified summary facts unavailable",
    ),
    plan(
      "skills",
      skills,
      "No unlocked skill facts on record",
    ),
    experiencePlan(evidence, facts),
    {
      key: "education",
      status: "unavailable",
      atomIds: ids(byKind("education")),
      unavailableMessage:
        "No verified education records in CareerOS — section omitted from invention; shown as unavailable.",
    },
    plan(
      "currentFocus",
      focus,
      "No current Decision Engine focus on record",
    ),
  ];

  return { sections };
}

function experiencePlan(
  evidence: ResumeFactAtom[],
  facts: ResumeFacts,
): ResumeSectionPlan {
  if (evidence.length === 0) {
    const unavailable = facts.atoms.find((a) => a.id === "experience.unavailable");
    return {
      key: "experience",
      status: "unavailable",
      atomIds: unavailable ? [unavailable.id] : [],
      unavailableMessage:
        "No verified project/course/portfolio Evidence on record. Do not invent employers or roles.",
    };
  }
  return {
    key: "experience",
    status: "include",
    atomIds: evidence.map((a) => a.id),
    unavailableMessage: null,
  };
}

function plan(
  key: ResumeSectionKey,
  atoms: ResumeFactAtom[],
  unavailableMessage: string,
): ResumeSectionPlan {
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
