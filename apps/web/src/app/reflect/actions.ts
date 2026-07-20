"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  confirmReflection,
  createReflection,
  declineReflection,
} from "@/lib/reflection/reflection-service";
import {
  createReflectionSchema,
  reflectionDecisionSchema,
} from "@/lib/reflection/reflection-schema";
import { createClient } from "@/lib/supabase/server";

export type ReflectionFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

/**
 * Creates a user-initiated reflection. The deterministic Reflection Engine
 * derives a PROPOSED update; nothing is committed to Mastery until the user
 * confirms it separately (confirmation gate, AD-19).
 */
export async function createReflectionAction(
  _prevState: ReflectionFormState,
  formData: FormData,
): Promise<ReflectionFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const parsed = createReflectionSchema.safeParse({
    skill_key: formData.get("skill_key"),
    self_assessment: formData.get("self_assessment"),
    response_text: formData.get("response_text") ?? "",
  });

  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await createReflection(supabase, user.id, parsed.data);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not save reflection.",
    };
  }

  revalidatePath("/reflect");
  revalidatePath("/history");
  return {};
}

/** Confirms a proposed reflection, committing its Evidence via the Evidence subsystem. */
export async function confirmReflectionAction(formData: FormData): Promise<void> {
  const parsed = reflectionDecisionSchema.safeParse({
    reflection_id: formData.get("reflection_id"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  await confirmReflection(supabase, user.id, parsed.data.reflection_id);

  revalidatePath("/reflect");
  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath("/roadmap");
}

/** Declines a proposed reflection. The record is preserved as signal. */
export async function declineReflectionAction(formData: FormData): Promise<void> {
  const parsed = reflectionDecisionSchema.safeParse({
    reflection_id: formData.get("reflection_id"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  await declineReflection(supabase, user.id, parsed.data.reflection_id);

  revalidatePath("/reflect");
  revalidatePath("/history");
}
