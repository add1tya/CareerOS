/**
 * AI Task: portfolio.compose (ADR-0028).
 */

import { z } from "zod";

import type { AiTask } from "@/lib/ai/tasks/types";
import {
  PORTFOLIO_INTELLIGENCE_VERSION,
  PORTFOLIO_SECTION_KEYS,
} from "@/lib/portfolio-intelligence/portfolio-intelligence-types";

export const PORTFOLIO_COMPOSE_TASK_TYPE = "portfolio.compose";
export const PORTFOLIO_COMPOSE_PROMPT_ID = "portfolio.compose";
export const PORTFOLIO_COMPOSE_PROMPT_VERSION = 1;

export const portfolioComposeItemSchema = z.object({
  text: z.string().min(1).max(800),
  citationIds: z.array(z.string().min(1)).min(1).max(20),
  /** Required for featuredProjects and learningJourney — copy atom id exactly. */
  stableId: z.string().min(1).max(128).nullable().optional(),
});

export const portfolioComposeSectionSchema = z.object({
  key: z.enum(PORTFOLIO_SECTION_KEYS),
  items: z.array(portfolioComposeItemSchema).min(1).max(24),
});

export const portfolioComposeOutputSchema = z.object({
  sections: z.array(portfolioComposeSectionSchema).min(1).max(10),
});

export type PortfolioComposeOutput = z.infer<
  typeof portfolioComposeOutputSchema
>;

export const portfolioComposeInputSchema = z.object({
  portfolioFactsJson: z.string().min(2),
  portfolioSectionsJson: z.string().min(2),
  portfolioIntelligenceVersion: z.number().int(),
});

export type PortfolioComposeInput = z.infer<
  typeof portfolioComposeInputSchema
>;

export const portfolioComposeTask: AiTask<
  PortfolioComposeInput,
  PortfolioComposeOutput
> = {
  taskType: PORTFOLIO_COMPOSE_TASK_TYPE,
  promptId: PORTFOLIO_COMPOSE_PROMPT_ID,
  promptVersion: PORTFOLIO_COMPOSE_PROMPT_VERSION,
  inputSchema: portfolioComposeInputSchema,
  outputSchema: portfolioComposeOutputSchema,
  buildPromptVariables: (input) => ({
    portfolio_facts_json: input.portfolioFactsJson,
    portfolio_sections_json: input.portfolioSectionsJson,
    portfolio_intelligence_version: String(input.portfolioIntelligenceVersion),
  }),
};

export function buildPortfolioComposeInput(
  portfolioFactsJson: string,
  portfolioSectionsJson: string,
): PortfolioComposeInput {
  return {
    portfolioFactsJson,
    portfolioSectionsJson,
    portfolioIntelligenceVersion: PORTFOLIO_INTELLIGENCE_VERSION,
  };
}
