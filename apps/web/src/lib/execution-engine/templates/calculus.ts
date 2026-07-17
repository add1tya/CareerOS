import type { SkillExecutionTemplate } from "./index";

/** Calculus — from ontology Suggested Projects (backprop from scratch, verify gradients). */
export const calculusTemplate: SkillExecutionTemplate = {
  skillKey: "calculus",
  templateVersion: 1,
  mission: {
    title: "Understand gradients by building them",
    description:
      "Make derivatives and the chain rule concrete by implementing backpropagation for a tiny neural network and verifying its gradients numerically.",
  },
  quests: [
    {
      title: "Derivatives by hand and in code",
      description:
        "Bridge analytic and numeric differentiation on small examples.",
      tasks: [
        {
          title: "Implement numeric differentiation",
          description:
            "Write a finite-difference derivative and test it on known functions.",
          estimatedMinutes: 45,
        },
        {
          title: "Apply the chain rule on a small graph",
          description:
            "Compose two or three functions and compute the derivative by hand and in code.",
          estimatedMinutes: 60,
        },
        {
          title: "Verify against the analytic derivative",
          description:
            "Confirm your numeric and analytic derivatives agree within tolerance.",
          estimatedMinutes: 30,
        },
      ],
    },
    {
      title: "Backprop from scratch",
      description:
        "Train a one-hidden-layer network with gradients you compute yourself.",
      tasks: [
        {
          title: "Build a one-hidden-layer forward pass",
          description:
            "Implement the forward computation for a tiny network on toy data.",
          estimatedMinutes: 75,
        },
        {
          title: "Implement backpropagation",
          description:
            "Derive and code the backward pass to compute gradients for each parameter.",
          estimatedMinutes: 90,
        },
        {
          title: "Verify gradients numerically",
          description:
            "Use finite differences to gradient-check your backprop implementation.",
          estimatedMinutes: 45,
        },
        {
          title: "Train on toy data",
          description:
            "Run gradient descent and confirm the loss decreases over iterations.",
          estimatedMinutes: 45,
        },
      ],
    },
  ],
};
