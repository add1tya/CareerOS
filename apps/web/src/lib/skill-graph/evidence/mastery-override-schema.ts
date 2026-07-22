import { z } from "zod";

import { MASTERY_OVERRIDE_LEVEL_IDS } from "./evidence-types";

/** Input for recording a mastery self-report override (Evidence, §5.5). */
export const masteryOverrideSchema = z.object({
  skill_key: z.string().trim().min(1, "Select a skill to correct."),
  level_id: z.enum(MASTERY_OVERRIDE_LEVEL_IDS, {
    message: "Choose how you assess your mastery.",
  }),
});

export type MasteryOverrideInput = z.input<typeof masteryOverrideSchema>;
export type MasteryOverridePayload = z.output<typeof masteryOverrideSchema>;
