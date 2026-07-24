import { describe, expect, it } from "vitest";

import { buildPortfolioDraft } from "@/lib/portfolio-intelligence/portfolio-draft";
import {
  formatPortfolioHtml,
  formatPortfolioMarkdown,
} from "@/lib/portfolio-intelligence/portfolio-export";
import { buildPortfolioSections } from "@/lib/portfolio-intelligence/portfolio-sections";
import type { PortfolioFacts } from "@/lib/portfolio-intelligence/portfolio-intelligence-types";

function facts(partial: Partial<PortfolioFacts> & { atoms: PortfolioFacts["atoms"] }): PortfolioFacts {
  return {
    sufficient: true,
    insufficientReason: null,
    assembledAt: "2026-07-25T00:00:00.000Z",
    goal: {
      title: "Become an AI Engineer",
      status: "active",
      deadline: "2027-01-01",
    },
    evidenceCount: 2,
    featuredProjectIds: [],
    learningJourneyIds: [],
    ...partial,
  };
}

const baseAtoms = [
  {
    id: "profile.display_name",
    kind: "profile",
    label: "Display name",
    value: "Ada",
  },
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
    id: "skill.python_basics",
    kind: "skill",
    label: "Python Basics",
    value:
      "status=mastered; mastery=0.90; confidence=0.80; domain=programming_systems",
  },
  {
    id: "technology.programming_systems",
    kind: "technology",
    label: "programming_systems",
    value: "Derived from Skill Graph domain",
  },
  {
    id: "project.aaa",
    kind: "project",
    label: "completed_project · Python Basics",
    value: "evidence_id=aaa; type=completed_project; recorded_at=2026-06-01",
  },
  {
    id: "project.bbb",
    kind: "project",
    label: "github_activity · Python Basics",
    value: "evidence_id=bbb; type=github_activity; recorded_at=2026-05-01",
  },
  {
    id: "timeline.bbb",
    kind: "timeline",
    label: "2026-05-01 · github_activity",
    value: "evidence_id=bbb; recorded_at=2026-05-01T00:00:00.000Z",
  },
  {
    id: "timeline.aaa",
    kind: "timeline",
    label: "2026-06-01 · completed_project",
    value: "evidence_id=aaa; recorded_at=2026-06-01T00:00:00.000Z",
  },
  {
    id: "certification.unavailable",
    kind: "certification",
    label: "Certifications",
    value: "none",
  },
  {
    id: "limits.not_resume",
    kind: "limits",
    label: "Not a resume",
    value: "proof showcase",
  },
  {
    id: "limits.not_website",
    kind: "limits",
    label: "Content only",
    value: "not a website",
  },
  {
    id: "limits.no_invention",
    kind: "limits",
    label: "No invention",
    value: "no invention",
  },
  {
    id: "meta.evidence_count",
    kind: "meta",
    label: "Evidence count",
    value: "2",
  },
];

describe("buildPortfolioSections", () => {
  it("preserves deterministic featured project order from Facts", () => {
    const f = facts({
      atoms: baseAtoms,
      featuredProjectIds: ["project.aaa", "project.bbb"],
      learningJourneyIds: ["timeline.bbb", "timeline.aaa"],
    });
    const sections = buildPortfolioSections(f);
    const featured = sections.sections.find((s) => s.key === "featuredProjects");
    const journey = sections.sections.find((s) => s.key === "learningJourney");
    expect(featured?.status).toBe("include");
    expect(featured?.atomIds).toEqual(["project.aaa", "project.bbb"]);
    expect(journey?.atomIds).toEqual(["timeline.bbb", "timeline.aaa"]);
  });

  it("marks certifications unavailable", () => {
    const f = facts({
      atoms: baseAtoms,
      featuredProjectIds: ["project.aaa"],
      learningJourneyIds: ["timeline.aaa"],
    });
    const cert = buildPortfolioSections(f).sections.find(
      (s) => s.key === "certifications",
    );
    expect(cert?.status).toBe("unavailable");
  });
});

describe("buildPortfolioDraft", () => {
  it("rejects reordered featured projects", () => {
    const f = facts({
      atoms: baseAtoms,
      featuredProjectIds: ["project.aaa", "project.bbb"],
      learningJourneyIds: ["timeline.bbb", "timeline.aaa"],
    });
    const sections = buildPortfolioSections(f);
    expect(() =>
      buildPortfolioDraft(
        {
          sections: [
            {
              key: "about",
              items: [
                {
                  text: "Ada",
                  citationIds: ["profile.display_name"],
                },
              ],
            },
            {
              key: "featuredProjects",
              items: [
                {
                  text: "Second first",
                  citationIds: ["project.bbb"],
                  stableId: "project.bbb",
                },
                {
                  text: "First second",
                  citationIds: ["project.aaa"],
                  stableId: "project.aaa",
                },
              ],
            },
            {
              key: "skills",
              items: [
                {
                  text: "Python",
                  citationIds: ["skill.python_basics"],
                },
              ],
            },
            {
              key: "technologies",
              items: [
                {
                  text: "programming_systems",
                  citationIds: ["technology.programming_systems"],
                },
              ],
            },
            {
              key: "learningJourney",
              items: [
                {
                  text: "May",
                  citationIds: ["timeline.bbb"],
                  stableId: "timeline.bbb",
                },
                {
                  text: "June",
                  citationIds: ["timeline.aaa"],
                  stableId: "timeline.aaa",
                },
              ],
            },
            {
              key: "achievements",
              items: [
                {
                  text: "Project",
                  citationIds: ["project.aaa"],
                },
              ],
            },
            {
              key: "portfolioMetadata",
              items: [
                {
                  text: "Meta",
                  citationIds: ["limits.not_resume"],
                },
              ],
            },
          ],
        },
        f,
        sections,
      ),
    ).toThrow(/order mismatch/);
  });

  it("rejects unknown citations", () => {
    const f = facts({
      atoms: baseAtoms,
      featuredProjectIds: ["project.aaa"],
      learningJourneyIds: ["timeline.aaa"],
    });
    const sections = buildPortfolioSections(f);
    expect(() =>
      buildPortfolioDraft(
        {
          sections: [
            {
              key: "about",
              items: [
                {
                  text: "Invented MegaCorp",
                  citationIds: ["not-real"],
                },
              ],
            },
            {
              key: "featuredProjects",
              items: [
                {
                  text: "Proj",
                  citationIds: ["project.aaa"],
                  stableId: "project.aaa",
                },
              ],
            },
            {
              key: "skills",
              items: [
                {
                  text: "Python",
                  citationIds: ["skill.python_basics"],
                },
              ],
            },
            {
              key: "technologies",
              items: [
                {
                  text: "programming_systems",
                  citationIds: ["technology.programming_systems"],
                },
              ],
            },
            {
              key: "learningJourney",
              items: [
                {
                  text: "June",
                  citationIds: ["timeline.aaa"],
                  stableId: "timeline.aaa",
                },
              ],
            },
            {
              key: "achievements",
              items: [
                {
                  text: "Project",
                  citationIds: ["project.aaa"],
                },
              ],
            },
            {
              key: "portfolioMetadata",
              items: [
                {
                  text: "Meta",
                  citationIds: ["limits.not_resume"],
                },
              ],
            },
          ],
        },
        f,
        sections,
      ),
    ).toThrow(/unknown Portfolio Fact atom/);
  });

  it("embeds mandatory metadata and exports deterministically", () => {
    const f = facts({
      atoms: baseAtoms,
      featuredProjectIds: ["project.aaa", "project.bbb"],
      learningJourneyIds: ["timeline.bbb", "timeline.aaa"],
    });
    const sections = buildPortfolioSections(f);
    const draft = buildPortfolioDraft(
      {
        sections: [
          {
            key: "about",
            items: [
              {
                text: "Ada targeting AI engineering.",
                citationIds: ["profile.display_name", "goal.title"],
              },
            ],
          },
          {
            key: "featuredProjects",
            items: [
              {
                text: "Completed Python project.",
                citationIds: ["project.aaa"],
                stableId: "project.aaa",
              },
              {
                text: "GitHub activity on Python.",
                citationIds: ["project.bbb"],
                stableId: "project.bbb",
              },
            ],
          },
          {
            key: "skills",
            items: [
              {
                text: "Python Basics mastered.",
                citationIds: ["skill.python_basics"],
              },
            ],
          },
          {
            key: "technologies",
            items: [
              {
                text: "programming_systems domain.",
                citationIds: ["technology.programming_systems"],
              },
            ],
          },
          {
            key: "learningJourney",
            items: [
              {
                text: "May GitHub activity.",
                citationIds: ["timeline.bbb"],
                stableId: "timeline.bbb",
              },
              {
                text: "June completed project.",
                citationIds: ["timeline.aaa"],
                stableId: "timeline.aaa",
              },
            ],
          },
          {
            key: "achievements",
            items: [
              {
                text: "Featured project work.",
                citationIds: ["project.aaa"],
              },
            ],
          },
          {
            key: "portfolioMetadata",
            items: [
              {
                text: "Content-only portfolio snapshot.",
                citationIds: ["limits.not_website", "meta.evidence_count"],
              },
            ],
          },
        ],
      },
      f,
      sections,
      "2026-07-25T12:00:00.000Z",
    );

    expect(draft.metadata.generatedAt).toBe("2026-07-25T12:00:00.000Z");
    expect(draft.metadata.goal.title).toBe("Become an AI Engineer");
    expect(draft.metadata.portfolioIntelligenceVersion).toBe(1);
    expect(draft.metadata.evidenceCount).toBe(2);
    expect(draft.metadata.factsHash.length).toBe(64);

    const md = formatPortfolioMarkdown(draft);
    expect(md).toContain("Featured Projects");
    expect(md).toContain("`project.aaa`");
    expect(md).toContain("Facts hash:");

    const html = formatPortfolioHtml(draft);
    expect(html).toContain("<h2>Featured Projects</h2>");
    expect(html).toContain("project.aaa");
  });
});
