import { describe, expect, it } from "vitest";

import type { DecisionExplanation } from "@/lib/decision-engine/explainability-types";
import { buildNarrativeFacts } from "@/lib/decision-engine/narrative-facts";
import { buildTraceFacts } from "@/lib/decision-engine/trace-facts";

const explanation: DecisionExplanation = {
  decisionExplanationVersion: 1,
  winnerName: "Python Basics",
  runnerUpName: "Git Fundamentals",
  decidingFactorId: "goal_impact",
  confidence: "HIGH",
  whyThisSkill: "Python Basics is rank 1.",
  whyNow: "Eligible at record time.",
  whyNotOther: "Beat Git on goal_impact.",
  ifSkipped: "Override suppresses until new Evidence.",
  goalAlignment: 'Active goal: "AI Engineer".',
};

const factors = {
  deciding_factor_id: "goal_impact",
  confidence: "HIGH",
  winner_skill_key: "python_basics",
  candidates: [
    {
      rank: 1,
      skill_key: "python_basics",
      name: "Python Basics",
      factors: [
        {
          factor_id: "goal_impact",
          raw_value: 1,
          display: "core",
        },
      ],
    },
    {
      rank: 2,
      skill_key: "git_fundamentals",
      name: "Git Fundamentals",
      factors: [
        {
          factor_id: "goal_impact",
          raw_value: 2,
          display: "supporting",
        },
      ],
    },
  ],
};

describe("buildTraceFacts", () => {
  it("marks sufficient when explanation and factors exist", () => {
    const facts = buildTraceFacts({
      recommendationId: "rec-1",
      rawFactors: factors,
      goalTitle: "AI Engineer",
      explanation,
    });
    expect(facts.sufficient).toBe(true);
    expect(facts.atoms.length).toBeGreaterThan(5);
    expect(facts.atoms.some((a) => a.id === "winner.name")).toBe(true);
  });

  it("marks insufficient without explanation", () => {
    const facts = buildTraceFacts({
      recommendationId: "rec-1",
      rawFactors: factors,
      goalTitle: null,
      explanation: null,
    });
    expect(facts.sufficient).toBe(false);
    expect(facts.insufficientReason).toBeTruthy();
  });
});

describe("buildNarrativeFacts", () => {
  it("rejects unknown citation ids", () => {
    const trace = buildTraceFacts({
      recommendationId: "rec-1",
      rawFactors: factors,
      goalTitle: "AI Engineer",
      explanation,
    });
    expect(() =>
      buildNarrativeFacts(
        {
          sections: [
            {
              key: "overview",
              prose: "x",
              citationIds: ["not-an-atom"],
            },
            {
              key: "whyThisSkill",
              prose: "x",
              citationIds: ["winner.name"],
            },
            {
              key: "whyNow",
              prose: "x",
              citationIds: ["winner.name"],
            },
            {
              key: "whyNotRunnerUp",
              prose: "x",
              citationIds: ["winner.name"],
            },
            {
              key: "ifSkipped",
              prose: "x",
              citationIds: ["winner.name"],
            },
            {
              key: "goalAlignment",
              prose: "x",
              citationIds: ["winner.name"],
            },
          ],
        },
        trace,
      ),
    ).toThrow(/unknown Trace Fact atom/);
  });

  it("accepts grounded sections", () => {
    const trace = buildTraceFacts({
      recommendationId: "rec-1",
      rawFactors: factors,
      goalTitle: "AI Engineer",
      explanation,
    });
    const cite = "winner.name";
    const facts = buildNarrativeFacts(
      {
        sections: [
          { key: "overview", prose: "Overview prose.", citationIds: [cite] },
          {
            key: "whyThisSkill",
            prose: "Why skill.",
            citationIds: [cite],
          },
          { key: "whyNow", prose: "Why now.", citationIds: [cite] },
          {
            key: "whyNotRunnerUp",
            prose: "Why not.",
            citationIds: [cite],
          },
          { key: "ifSkipped", prose: "If skipped.", citationIds: [cite] },
          {
            key: "goalAlignment",
            prose: "Goal.",
            citationIds: [cite],
          },
        ],
      },
      trace,
    );
    expect(facts.sections).toHaveLength(6);
    expect(facts.traceNarratorVersion).toBe(1);
  });
});
