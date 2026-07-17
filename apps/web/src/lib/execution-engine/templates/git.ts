import type { SkillExecutionTemplate } from "./index";

/** Git — from ontology Suggested Projects (maintain a real project's history). */
export const gitTemplate: SkillExecutionTemplate = {
  skillKey: "git",
  templateVersion: 1,
  mission: {
    title: "Develop real Git fluency",
    description:
      "Go beyond add/commit/push: maintain a clean, intentional history and recover confidently when things go wrong — the way a working engineer actually uses Git.",
  },
  quests: [
    {
      title: "Practice a clean-history workflow",
      description:
        "Run a small project with a deliberate branch strategy and tidy commits.",
      tasks: [
        {
          title: "Initialize a repo with a branch strategy",
          description:
            "Create a repo, define main + feature branches, and write down the rules you'll follow.",
          estimatedMinutes: 30,
        },
        {
          title: "Make a series of atomic commits",
          description:
            "Implement a small change as several focused commits with clear imperative messages.",
          estimatedMinutes: 45,
        },
        {
          title: "Tidy history with an interactive rebase",
          description:
            "Squash, reword, and reorder commits so the branch reads as a clean story.",
          estimatedMinutes: 45,
        },
        {
          title: "Open and merge a pull request",
          description:
            "Push the branch, open a PR, and merge it — observe how the strategy shapes history.",
          estimatedMinutes: 30,
        },
      ],
    },
    {
      title: "Recover under pressure",
      description:
        "Deliberately create and resolve the situations that scare people.",
      tasks: [
        {
          title: "Create and resolve a real merge conflict",
          description:
            "Force a conflict between two branches and resolve it by hand, understanding each side.",
          estimatedMinutes: 45,
        },
        {
          title: "Find a regression with git bisect",
          description:
            "Introduce a bug several commits back and use bisect to pinpoint the offending commit.",
          estimatedMinutes: 45,
        },
        {
          title: "Recover lost work with the reflog",
          description:
            "Simulate a bad reset, then recover the 'lost' commit using git reflog.",
          estimatedMinutes: 30,
        },
      ],
    },
  ],
};
