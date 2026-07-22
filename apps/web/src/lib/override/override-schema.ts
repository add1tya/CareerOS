import { z } from "zod";

import { OVERRIDE_REASON_CODES } from "@/lib/override/override-types";

export const overrideRecommendationSchema = z.object({
  recommendation_id: z.string().uuid(),
  reason_code: z.enum(OVERRIDE_REASON_CODES),
  reason_text: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
});

export type OverrideRecommendationPayload = z.output<
  typeof overrideRecommendationSchema
>;

export const skipTaskSchema = z.object({
  task_id: z.string().uuid(),
  reason_code: z.enum(OVERRIDE_REASON_CODES),
  reason_text: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
});

export type SkipTaskPayload = z.output<typeof skipTaskSchema>;
