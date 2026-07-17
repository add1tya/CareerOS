import type { SkillExecutionTemplate } from "./index";

/** Probability — from ontology Suggested Projects (Bayesian inference / sampling tool). */
export const probabilityTemplate: SkillExecutionTemplate = {
  skillKey: "probability",
  templateVersion: 1,
  mission: {
    title: "Reason about uncertainty in code",
    description:
      "Turn probability from formulas into working intuition: sample from distributions, estimate quantities by simulation, and build a small Bayesian update tool.",
  },
  quests: [
    {
      title: "Distributions and sampling",
      description:
        "Generate and reason about randomness empirically.",
      tasks: [
        {
          title: "Sample from common distributions",
          description:
            "Draw samples from uniform, normal, and Bernoulli distributions in code.",
          estimatedMinutes: 45,
        },
        {
          title: "Visualize the distributions",
          description:
            "Plot histograms of your samples and compare to the theoretical density.",
          estimatedMinutes: 45,
        },
        {
          title: "Estimate statistics via Monte Carlo",
          description:
            "Estimate a mean, variance, or probability by simulation and compare to the exact value.",
          estimatedMinutes: 60,
        },
      ],
    },
    {
      title: "Build a Bayesian update tool",
      description:
        "Apply Bayes' rule to update beliefs from evidence.",
      tasks: [
        {
          title: "Implement a Bayes update for a simple model",
          description:
            "Code prior -> likelihood -> posterior for a coin-bias or similar model.",
          estimatedMinutes: 75,
        },
        {
          title: "Build a small inference demo",
          description:
            "Feed in observations one at a time and show the posterior shifting.",
          estimatedMinutes: 60,
        },
        {
          title: "Write up the interpretation",
          description:
            "Explain in a paragraph what the prior, likelihood, and posterior each represent.",
          estimatedMinutes: 30,
        },
      ],
    },
  ],
};
