import type { SkillExecutionTemplate } from "./index";

/** TypeScript — from ontology Suggested Projects (typed CLI, typed API contract). */
export const typescriptTemplate: SkillExecutionTemplate = {
  skillKey: "typescript",
  templateVersion: 1,
  mission: {
    title: "Design types that prevent bugs",
    description:
      "Use TypeScript's type system as a design tool: model a domain precisely, then enforce a typed contract across a boundary so whole classes of bugs become impossible.",
  },
  quests: [
    {
      title: "Build a strictly-typed CLI",
      description:
        "Model a small domain with the type system and back it with a working CLI.",
      tasks: [
        {
          title: "Scaffold a TS project in strict mode",
          description:
            "Initialize the project with strict: true and confirm the build and a hello-world run.",
          estimatedMinutes: 45,
        },
        {
          title: "Model the domain with unions and generics",
          description:
            "Express the core state with discriminated unions and a generic helper where it earns its place.",
          estimatedMinutes: 75,
        },
        {
          title: "Implement the CLI logic against the types",
          description:
            "Write the behavior so the compiler enforces exhaustive handling of every case.",
          estimatedMinutes: 75,
        },
        {
          title: "Add tests for the core logic",
          description:
            "Cover the main flows and one impossible-state attempt that the types reject.",
          estimatedMinutes: 60,
        },
      ],
    },
    {
      title: "Enforce a typed API contract",
      description:
        "Share request/response types across a boundary so client and server agree at compile time.",
      tasks: [
        {
          title: "Define shared request/response types",
          description:
            "Create a single source of truth for the contract types used on both sides.",
          estimatedMinutes: 60,
        },
        {
          title: "Implement a typed client",
          description:
            "Write a client that consumes the shared types — no stringly-typed responses.",
          estimatedMinutes: 75,
        },
        {
          title: "Enforce exhaustive handling of variants",
          description:
            "Use never-checks so adding a new variant forces every handler to update.",
          estimatedMinutes: 60,
        },
      ],
    },
  ],
};
