import { describe, expect, it } from "vitest";

import { buildGapReport } from "@/lib/gap-analysis/gap-report";
import { buildGapSections } from "@/lib/gap-analysis/gap-sections";
import {
  GAP_SECTION_KEYS,
  type GapFacts,
} from "@/lib/gap-analysis/gap-analysis-types";

function facts(atoms: GapFacts["atoms"]): GapFacts {
  return {
    sufficient: true,
    insufficientReason: null,
    atoms,
    assembledAt: "2026-07-24T00:00:00.000Z",
    goal: {
      title: "Become an AI Engineer",
      status: "active",
      deadline: "2027-01-01",
    },
  };
}

const baseAtoms: GapFacts["atoms"] = [
  {
    id: "goal.title",
    kind: "goal",
    label: "Active goal",
    value: "Become an AI Engineer",
  },
  {
    id: "progress.stage",
    kind: "progress",
    label: "Roadmap stage",
    value: "in_progress",
  },
  {
    id: "strength.python_basics",
    kind: "strength",
    label: "Python Basics",
    value: "status=mastered; mastery=0.90; confidence=0.80",
  },
  {
    id: "missing.git_fundamentals",
    kind: "missing",
    label: "Git Fundamentals",
    value: "status=available; mastery=0.00; evidence_count=0",
  },
  {
    id: "weak.sql_basics",
    kind: "weak",
    label: "SQL Basics",
    value:
      "status=practicing; mastery=0.30; evidence_count=2; note=evidence_present_low_mastery",
  },
  {
    id: "roadmap.python_basics",
    kind: "roadmap",
    label: "Python Basics",
    value: "kind=completed; status=mastered; mastery=0.90; confidence=0.80",
  },
  {
    id: "roadmap.git_fundamentals",
    kind: "roadmap",
    label: "Git Fundamentals",
    value: "kind=current; status=available; mastery=0.00; confidence=0.10",
  },
  {
    id: "limits.not_progress_score",
    kind: "limits",
    label: "Measurement limits",
    value: "Not a Progress Score.",
  },
  {
    id: "limits.not_planning",
    kind: "limits",
    label: "Planning ownership",
    value: "Does not plan.",
  },
  {
    id: "limits.present_tense",
    kind: "limits",
    label: "Present tense",
    value: "Current state only.",
  },
];

describe("buildGapSections", () => {
  it("keeps missing and weak on separate section plans", () => {
    const sections = buildGapSections(facts(baseAtoms));
    const missing = sections.sections.find((s) => s.key === "missing");
    const weaknesses = sections.sections.find((s) => s.key === "weaknesses");
    expect(missing?.status).toBe("include");
    expect(missing?.atomIds).toEqual(["missing.git_fundamentals"]);
    expect(weaknesses?.status).toBe("include");
    expect(weaknesses?.atomIds).toEqual(["weak.sql_basics"]);
    expect(missing?.atomIds).not.toEqual(weaknesses?.atomIds);
  });

  it("never puts weak atoms on the missing section", () => {
    const sections = buildGapSections(facts(baseAtoms));
    const missing = sections.sections.find((s) => s.key === "missing");
    expect(missing?.atomIds.some((id) => id.startsWith("weak."))).toBe(false);
  });
});

describe("buildGapReport", () => {
  it("rejects unknown citation ids", () => {
    const f = facts(baseAtoms);
    const sections = buildGapSections(f);
    expect(() =>
      buildGapReport(
        {
          sections: [
            {
              key: "overview",
              prose: "x",
              citationIds: ["not-an-atom"],
            },
            {
              key: "strengths",
              prose: "x",
              citationIds: ["strength.python_basics"],
            },
            {
              key: "missing",
              prose: "x",
              citationIds: ["missing.git_fundamentals"],
            },
            {
              key: "weaknesses",
              prose: "x",
              citationIds: ["weak.sql_basics"],
            },
            {
              key: "roadmapGaps",
              prose: "x",
              citationIds: ["roadmap.git_fundamentals"],
            },
            {
              key: "measurementLimits",
              prose: "x",
              citationIds: ["limits.present_tense"],
            },
          ],
        },
        f,
        sections,
      ),
    ).toThrow(/unknown Gap Fact atom/);
  });

  it("orders sections by GAP_SECTION_KEYS regardless of AI order", () => {
    const f = facts(baseAtoms);
    const sections = buildGapSections(f);
    const report = buildGapReport(
      {
        sections: [
          {
            key: "measurementLimits",
            prose: "Limits.",
            citationIds: ["limits.present_tense"],
          },
          {
            key: "weaknesses",
            prose: "SQL is weak.",
            citationIds: ["weak.sql_basics"],
          },
          {
            key: "missing",
            prose: "Git has no evidence.",
            citationIds: ["missing.git_fundamentals"],
          },
          {
            key: "strengths",
            prose: "Python is a strength.",
            citationIds: ["strength.python_basics"],
          },
          {
            key: "roadmapGaps",
            prose: "Git is current.",
            citationIds: ["roadmap.git_fundamentals"],
          },
          {
            key: "overview",
            prose: "Working toward AI Engineer.",
            citationIds: ["goal.title"],
          },
        ],
      },
      f,
      sections,
      "2026-07-24T12:00:00.000Z",
    );

    const composedKeys = report.sections
      .filter((s) => s.status === "composed" || s.status === "unavailable")
      .map((s) => s.key);
    const expectedOrder = GAP_SECTION_KEYS.filter((key) =>
      composedKeys.includes(key),
    );
    expect(composedKeys).toEqual(expectedOrder);
    expect(report.metadata.gapAnalysisVersion).toBe(1);
    expect(report.metadata.generatedAt).toBe("2026-07-24T12:00:00.000Z");
    expect(report.metadata.goal.title).toBe("Become an AI Engineer");
    expect(report.metadata.factsHash.length).toBe(64);
  });
});
