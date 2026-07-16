import { z } from "zod";

export const TARGET_ROLE_OPTIONS = [
  "AI Engineer",
  "ML Engineer",
  "Software Engineer",
  "Data Scientist",
  "AI Product Manager",
  "Research Scientist",
  "Custom",
] as const;

export type TargetRoleOption = (typeof TARGET_ROLE_OPTIONS)[number];

export const onboardingInputSchema = z
  .object({
    display_name: z
      .string()
      .trim()
      .min(1, "Name is required.")
      .max(100, "Name must be at most 100 characters."),
    current_profession: z
      .string()
      .trim()
      .min(1, "Current profession is required.")
      .max(120, "Current profession must be at most 120 characters."),
    target_role_option: z.enum(TARGET_ROLE_OPTIONS, {
      message: "Select a target role.",
    }),
    target_role_custom: z.string().trim().max(120).optional().default(""),
    timeline_months: z.coerce
      .number()
      .int("Timeline must be a whole number of months.")
      .min(1, "Timeline must be at least 1 month.")
      .max(120, "Timeline must be at most 120 months."),
    available_hours_per_week: z.coerce
      .number()
      .int("Hours must be a whole number.")
      .min(1, "Available hours must be at least 1.")
      .max(80, "Available hours must be at most 80."),
  })
  .superRefine((data, ctx) => {
    if (data.target_role_option === "Custom") {
      if (!data.target_role_custom || data.target_role_custom.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["target_role_custom"],
          message: "Enter a custom target role.",
        });
      }
    }
  })
  .transform((data) => ({
    display_name: data.display_name,
    current_profession: data.current_profession,
    target_role:
      data.target_role_option === "Custom"
        ? data.target_role_custom
        : data.target_role_option,
    timeline_months: data.timeline_months,
    available_hours_per_week: data.available_hours_per_week,
  }));

export type OnboardingInput = z.input<typeof onboardingInputSchema>;
export type OnboardingPayload = z.output<typeof onboardingInputSchema>;
