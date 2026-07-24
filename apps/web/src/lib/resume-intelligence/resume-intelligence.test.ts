import { describe, expect, it } from "vitest";

import { buildResumeDraft } from "@/lib/resume-intelligence/draft-facts";
import { buildResumeSections } from "@/lib/resume-intelligence/resume-sections";
import type { ResumeFacts } from "@/lib/resume-intelligence/resume-intelligence-types";

function facts(atoms: ResumeFacts["atoms"], sufficient = true): ResumeFacts {
  return {
    sufficient,
    insufficientReason: sufficient ? null : "Need more facts",
    atoms,
    assembledAt: "2026-07-24T00:00:00.000Z",
  };
}

describe("buildResumeSections", () => {
  it("marks experience unavailable when no verified evidence atoms", () => {
    const f = facts([
      {
        id: "profile.display_name",
        kind: "profile",
        label: "Display name",
        value: "Ada",
      },
      {
        id: "profile.target_role",
        kind: "profile",
        label: "Target role",
        value: "AI Engineer",
      },
      {
        id: "skill.python_basics",
        kind: "skill",
        label: "Python Basics",
        value: "status=in_progress; mastery=0.40; confidence=0.50",
      },
      {
        id: "experience.unavailable",
        kind: "evidence",
        label: "Verified experience",
        value: "No verified project/course/portfolio Evidence on record",
      },
      {
        id: "education.unavailable",
        kind: "education",
        label: "Education",
        value: "No verified education records in CareerOS",
      },
    ]);
    const sections = buildResumeSections(f);
    const experience = sections.sections.find((s) => s.key === "experience");
    const education = sections.sections.find((s) => s.key === "education");
    expect(experience?.status).toBe("unavailable");
    expect(experience?.unavailableMessage).toMatch(/Do not invent/i);
    expect(education?.status).toBe("unavailable");
  });

  it("includes experience when evidence atoms exist", () => {
    const f = facts([
      {
        id: "profile.display_name",
        kind: "profile",
        label: "Display name",
        value: "Ada",
      },
      {
        id: "skill.python_basics",
        kind: "skill",
        label: "Python Basics",
        value: "status=mastered; mastery=0.90; confidence=0.80",
      },
      {
        id: "evidence.abc",
        kind: "evidence",
        label: "completed_project · Python Basics",
        value: "recorded_at=2026-01-01; implied_mastery=0.8; content_ref=none",
      },
      {
        id: "education.unavailable",
        kind: "education",
        label: "Education",
        value: "No verified education records in CareerOS",
      },
    ]);
    const sections = buildResumeSections(f);
    const experience = sections.sections.find((s) => s.key === "experience");
    expect(experience?.status).toBe("include");
    expect(experience?.atomIds).toEqual(["evidence.abc"]);
  });
});

describe("buildResumeDraft", () => {
  it("rejects unknown citation ids", () => {
    const f = facts([
      {
        id: "profile.display_name",
        kind: "profile",
        label: "Display name",
        value: "Ada",
      },
      {
        id: "profile.target_role",
        kind: "profile",
        label: "Target role",
        value: "AI Engineer",
      },
      {
        id: "skill.python_basics",
        kind: "skill",
        label: "Python Basics",
        value: "status=in_progress; mastery=0.40; confidence=0.50",
      },
      {
        id: "experience.unavailable",
        kind: "evidence",
        label: "Verified experience",
        value: "none",
      },
      {
        id: "education.unavailable",
        kind: "education",
        label: "Education",
        value: "none",
      },
    ]);
    const sections = buildResumeSections(f);
    expect(() =>
      buildResumeDraft(
        {
          sections: [
            {
              key: "headline",
              items: [
                {
                  text: "Invented employer at MegaCorp",
                  citationIds: ["not-a-fact"],
                },
              ],
            },
            {
              key: "summary",
              items: [
                {
                  text: "Summary",
                  citationIds: ["profile.display_name"],
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
          ],
        },
        f,
        sections,
      ),
    ).toThrow(/unknown Resume Fact atom/);
  });

  it("rejects citations outside the section plan", () => {
    const f = facts([
      {
        id: "profile.display_name",
        kind: "profile",
        label: "Display name",
        value: "Ada",
      },
      {
        id: "profile.target_role",
        kind: "profile",
        label: "Target role",
        value: "AI Engineer",
      },
      {
        id: "skill.python_basics",
        kind: "skill",
        label: "Python Basics",
        value: "status=in_progress; mastery=0.40; confidence=0.50",
      },
      {
        id: "experience.unavailable",
        kind: "evidence",
        label: "Verified experience",
        value: "none",
      },
      {
        id: "education.unavailable",
        kind: "education",
        label: "Education",
        value: "none",
      },
    ]);
    const sections = buildResumeSections(f);
    expect(() =>
      buildResumeDraft(
        {
          sections: [
            {
              key: "headline",
              items: [
                {
                  text: "Ada",
                  citationIds: ["skill.python_basics"],
                },
              ],
            },
            {
              key: "summary",
              items: [
                {
                  text: "Summary",
                  citationIds: ["profile.display_name"],
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
          ],
        },
        f,
        sections,
      ),
    ).toThrow(/not assigned to this section plan/);
  });

  it("preserves unavailable experience without inventing items", () => {
    const f = facts([
      {
        id: "profile.display_name",
        kind: "profile",
        label: "Display name",
        value: "Ada",
      },
      {
        id: "profile.target_role",
        kind: "profile",
        label: "Target role",
        value: "AI Engineer",
      },
      {
        id: "skill.python_basics",
        kind: "skill",
        label: "Python Basics",
        value: "status=in_progress; mastery=0.40; confidence=0.50",
      },
      {
        id: "experience.unavailable",
        kind: "evidence",
        label: "Verified experience",
        value: "none",
      },
      {
        id: "education.unavailable",
        kind: "education",
        label: "Education",
        value: "none",
      },
    ]);
    const sections = buildResumeSections(f);
    const draft = buildResumeDraft(
      {
        sections: [
          {
            key: "headline",
            items: [
              {
                text: "Ada — AI Engineer",
                citationIds: ["profile.display_name", "profile.target_role"],
              },
            ],
          },
          {
            key: "summary",
            items: [
              {
                text: "Transitioning toward AI engineering.",
                citationIds: ["profile.target_role"],
              },
            ],
          },
          {
            key: "skills",
            items: [
              {
                text: "Python Basics (in progress).",
                citationIds: ["skill.python_basics"],
              },
            ],
          },
        ],
      },
      f,
      sections,
    );
    const experience = draft.sections.find((s) => s.key === "experience");
    expect(experience?.status).toBe("unavailable");
    expect(experience?.items).toEqual([]);
  });
});
