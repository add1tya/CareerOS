import { describe, expect, it } from "vitest";

import { buildProposalFacts } from "@/lib/evidence-extraction/proposal-facts";

describe("buildProposalFacts", () => {
  const allowed = new Set(["python_basics", "rag_chunking"]);

  it("assigns stable proposal ids and clamps mastery", () => {
    const result = buildProposalFacts(
      {
        proposals: [
          {
            skillKey: "python_basics",
            evidenceType: "self_report",
            impliedMastery: 0.95,
            summary: "Completed intro course",
            proposalConfidence: "high",
          },
        ],
      },
      allowed,
    );

    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0]?.proposalId).toMatch(
      /^[0-9a-f-]{36}$/i,
    );
    expect(result.proposals[0]?.impliedMastery).toBe(0.5);
    expect(result.proposals[0]?.proposalConfidence).toBe("high");
  });

  it("drops unknown skill keys", () => {
    const result = buildProposalFacts(
      {
        proposals: [
          {
            skillKey: "not_a_skill",
            evidenceType: "course_completion",
            impliedMastery: 0.4,
            summary: "x",
            proposalConfidence: "low",
          },
        ],
      },
      allowed,
    );
    expect(result.proposals).toHaveLength(0);
    expect(result.droppedCount).toBe(1);
  });

  it("caps proposal count at MAX_PROPOSALS", () => {
    const proposals = Array.from({ length: 8 }, (_, i) => ({
      skillKey: "python_basics",
      evidenceType: "self_report" as const,
      impliedMastery: 0.2,
      summary: `s${i}`,
      proposalConfidence: "medium" as const,
    }));
    const result = buildProposalFacts({ proposals }, allowed);
    expect(result.proposals).toHaveLength(5);
    expect(result.droppedCount).toBe(3);
  });
});
