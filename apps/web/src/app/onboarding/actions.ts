"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { initializeCareerGraph } from "@/lib/career-graph-service";
import { onboardingInputSchema } from "@/lib/onboarding-schema";
import { completeOnboarding } from "@/lib/profile-service";
import { createClient } from "@/lib/supabase/server";

export type OnboardingActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function submitOnboarding(
  _prevState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const parsed = onboardingInputSchema.safeParse({
    display_name: formData.get("display_name"),
    current_profession: formData.get("current_profession"),
    target_role_option: formData.get("target_role_option"),
    target_role_custom: formData.get("target_role_custom") ?? "",
    timeline_months: formData.get("timeline_months"),
    available_hours_per_week: formData.get("available_hours_per_week"),
  });

  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await completeOnboarding(supabase, user.id, parsed.data);
    await initializeCareerGraph(supabase, user.id);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not save onboarding.";
    return { error: message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
