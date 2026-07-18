import { z } from "zod";

import { SELF_ASSESSMENT_LEVELS } from "./reflection-types";

/** Input for creating a user-initiated reflection. */
export const createReflectionSchema = z.object({
  skill_key: z.string().trim().min(1, "Select a skill to reflect on."),
  self_assessment: z.enum(SELF_ASSESSMENT_LEVELS, {
    message: "Choose how confident you feel.",
  }),
  response_text: z
    .string()
    .trim()
    .max(2000, "Reflection must be at most 2000 characters.")
    .optional()
    .default(""),
});

export type CreateReflectionInput = z.input<typeof createReflectionSchema>;
export type CreateReflectionPayload = z.output<typeof createReflectionSchema>;

/** Input for confirming or declining a proposed reflection. */
export const reflectionDecisionSchema = z.object({
  reflection_id: z.string().uuid("Invalid reflection."),
});
