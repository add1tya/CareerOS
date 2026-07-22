import { z } from "zod";

/** Minimal hours update — fact channel for Opportunity Assessment only. */
export const updateAvailableHoursSchema = z.object({
  available_hours_per_week: z.coerce
    .number()
    .int("Hours must be a whole number.")
    .min(1, "At least 1 hour per week.")
    .max(80, "At most 80 hours per week."),
});

export type UpdateAvailableHoursPayload = z.output<
  typeof updateAvailableHoursSchema
>;
