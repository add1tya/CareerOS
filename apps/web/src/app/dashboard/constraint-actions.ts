"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { updateAvailableHoursSchema } from "@/lib/opportunity/constraint-hours-schema";
import { updateAvailableHours } from "@/lib/opportunity/constraint-hours-service";
import { createClient } from "@/lib/supabase/server";

export type ConstraintHoursFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
};

/**
 * Minimal available-hours update. Creates the Constraint Change History fact
 * Opportunity Assessment projects from — not general constraint management.
 */
export async function updateAvailableHoursAction(
  _prevState: ConstraintHoursFormState,
  formData: FormData,
): Promise<ConstraintHoursFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const parsed = updateAvailableHoursSchema.safeParse({
    available_hours_per_week: formData.get("available_hours_per_week"),
  });

  if (!parsed.success) {
    return {
      error: "Please enter a valid hours value.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  try {
    await updateAvailableHours(supabase, user.id, {
      availableHoursPerWeek: parsed.data.available_hours_per_week,
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not update hours.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/roadmap");
  revalidatePath("/history");
  revalidatePath("/export");
  return { success: true };
}
