import type { SkillExecutionTemplate } from "./index";

/** Python — from ontology Suggested Projects (CLI tool, small typed library). */
export const pythonTemplate: SkillExecutionTemplate = {
  skillKey: "python",
  templateVersion: 1,
  mission: {
    title: "Build real, tested Python foundations",
    description:
      "Move from syntax to shipping real Python: a useful CLI tool, then a small, typed, tested library. Learn by building artifacts you could actually use.",
  },
  quests: [
    {
      title: "Ship a useful CLI tool",
      description:
        "Build a command-line tool that solves a small real problem end to end.",
      tasks: [
        {
          title: "Scaffold the project and a virtual environment",
          description:
            "Create a project folder, initialize a venv, and add a pyproject or requirements file. Confirm it runs.",
          estimatedMinutes: 45,
        },
        {
          title: "Implement the core command logic",
          description:
            "Write the main function that does the useful work — pick a real task you'd actually run.",
          estimatedMinutes: 90,
        },
        {
          title: "Add argument parsing and error handling",
          description:
            "Use argparse (or similar) for inputs, and handle bad input with clear messages instead of tracebacks.",
          estimatedMinutes: 60,
        },
        {
          title: "Write unit tests for the core logic",
          description:
            "Add pytest tests covering the happy path and at least two edge cases.",
          estimatedMinutes: 60,
        },
      ],
    },
    {
      title: "Package a small typed library",
      description:
        "Extract reusable logic into a typed, tested module you could publish.",
      tasks: [
        {
          title: "Extract logic into a module with type hints",
          description:
            "Refactor the reusable core into functions with full type annotations.",
          estimatedMinutes: 60,
        },
        {
          title: "Add tests and measure coverage",
          description:
            "Grow the test suite and run coverage to find untested branches.",
          estimatedMinutes: 60,
        },
        {
          title: "Write a README and publish to TestPyPI",
          description:
            "Document usage, then build and upload the package to TestPyPI to prove the full pipeline.",
          estimatedMinutes: 75,
        },
      ],
    },
  ],
};
