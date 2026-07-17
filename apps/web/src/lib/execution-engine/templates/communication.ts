import type { SkillExecutionTemplate } from "./index";

/** Communication — from ontology Suggested Projects (clear technical writing, feedback). */
export const communicationTemplate: SkillExecutionTemplate = {
  skillKey: "communication",
  templateVersion: 1,
  mission: {
    title: "Communicate technical work clearly",
    description:
      "Practice conveying technical ideas to real audiences: write an explainer and document a project, revising against actual feedback.",
  },
  quests: [
    {
      title: "Write an explainer",
      description:
        "Explain something you know clearly enough for a non-expert.",
      tasks: [
        {
          title: "Pick a concept you understand well",
          description:
            "Choose a technical idea you could teach and define the target reader.",
          estimatedMinutes: 20,
        },
        {
          title: "Draft a one-page explainer",
          description:
            "Write a first draft that explains the concept with a concrete example.",
          estimatedMinutes: 60,
        },
        {
          title: "Revise for a non-expert",
          description:
            "Cut jargon, add an analogy, and tighten structure so a newcomer follows it.",
          estimatedMinutes: 45,
        },
        {
          title: "Get feedback from one person",
          description:
            "Share it, ask what was unclear, and note what to change.",
          estimatedMinutes: 30,
        },
      ],
    },
    {
      title: "Document a project",
      description:
        "Make one of your projects understandable to others.",
      tasks: [
        {
          title: "Write a project README",
          description:
            "Explain what it does, why it exists, and how to run it.",
          estimatedMinutes: 45,
        },
        {
          title: "Add an architecture note",
          description:
            "Describe the key components and one important design decision.",
          estimatedMinutes: 45,
        },
        {
          title: "Solicit clarity feedback",
          description:
            "Ask a reader whether they could get started from your docs alone.",
          estimatedMinutes: 30,
        },
      ],
    },
  ],
};
