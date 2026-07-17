import type { SkillExecutionTemplate } from "./index";

/** CS Fundamentals — from ontology Suggested Projects (build a small interpreter). */
export const csFundamentalsTemplate: SkillExecutionTemplate = {
  skillKey: "cs-fundamentals",
  templateVersion: 1,
  mission: {
    title: "Build CS fundamentals through implementation",
    description:
      "Internalize computation, abstraction, and complexity by building a small interpreter from scratch, then reasoning rigorously about its cost.",
  },
  quests: [
    {
      title: "Build a toy interpreter",
      description:
        "Implement the classic tokenize -> parse -> evaluate pipeline for a tiny language.",
      tasks: [
        {
          title: "Tokenize a small language",
          description:
            "Write a lexer that turns source text into a stream of tokens.",
          estimatedMinutes: 60,
        },
        {
          title: "Parse tokens into an AST",
          description:
            "Build a parser that produces an abstract syntax tree from the tokens.",
          estimatedMinutes: 90,
        },
        {
          title: "Evaluate expressions",
          description:
            "Walk the AST to compute results, handling operator precedence correctly.",
          estimatedMinutes: 75,
        },
        {
          title: "Add tests for the interpreter",
          description:
            "Cover arithmetic, precedence, and at least one error case.",
          estimatedMinutes: 45,
        },
      ],
    },
    {
      title: "Reason about complexity",
      description:
        "Analyze and improve the cost of what you built.",
      tasks: [
        {
          title: "Analyze time and space of your interpreter",
          description:
            "Write down the Big-O of tokenizing, parsing, and evaluating, with justification.",
          estimatedMinutes: 45,
        },
        {
          title: "Refactor a hotspot",
          description:
            "Find the slowest or most wasteful part and improve it, measuring before/after.",
          estimatedMinutes: 60,
        },
        {
          title: "Document the Big-O of core operations",
          description:
            "Write a short note mapping each core operation to its complexity and why.",
          estimatedMinutes: 30,
        },
      ],
    },
  ],
};
