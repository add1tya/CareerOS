import type { SkillExecutionTemplate } from "./index";

/** Projects — the meta-skill of converting learning into real, shipped artifacts. */
export const projectsTemplate: SkillExecutionTemplate = {
  skillKey: "projects",
  templateVersion: 1,
  mission: {
    title: "Ship a small real project",
    description:
      "Practice the meta-skill that makes every other skill legible: scoping, building, and shipping a real artifact, then reflecting honestly on it.",
  },
  quests: [
    {
      title: "Scope and build",
      description:
        "Take a real problem from idea to a shipped minimal version.",
      tasks: [
        {
          title: "Define a minimal real problem",
          description:
            "Write one sentence describing a real problem worth solving for yourself.",
          estimatedMinutes: 20,
        },
        {
          title: "Scope the MVP",
          description:
            "List the smallest feature set that solves the problem — and what you're cutting.",
          estimatedMinutes: 30,
        },
        {
          title: "Build the core",
          description:
            "Implement the essential path end to end, even if rough.",
          estimatedMinutes: 120,
        },
        {
          title: "Deploy or share it",
          description:
            "Get it in front of at least one real user (including yourself in real use).",
          estimatedMinutes: 45,
        },
      ],
    },
    {
      title: "Reflect and improve",
      description:
        "Turn first contact with reality into one concrete improvement.",
      tasks: [
        {
          title: "Gather feedback",
          description:
            "Collect concrete reactions from using it or from one other person.",
          estimatedMinutes: 30,
        },
        {
          title: "Fix the top issue",
          description:
            "Pick the single most impactful problem and fix it.",
          estimatedMinutes: 60,
        },
        {
          title: "Write what you cut and why",
          description:
            "Document the scope decisions so the reasoning is legible later.",
          estimatedMinutes: 30,
        },
      ],
    },
  ],
};
