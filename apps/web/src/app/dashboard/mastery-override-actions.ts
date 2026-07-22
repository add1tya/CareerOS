"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordMasteryOverrideEvidence } from "@/lib/skill-graph/evidence/evidence-service";
import { masteryOverrideSchema } from "@/lib/skill-graph/evidence/mastery-override-schema";
import { createClient } from "@/lib/supabase/server";

export type MasteryOverrideFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
};

/**
 * Records a mastery self-report override as Tier-1 Evidence and folds it into
 * the skill overlay. Immediate commit (no Reflection-style propose gate).
 */
export async function recordMasteryOverrideAction(
  _prevState: MasteryOverrideFormState,
  formData: FormData,
): Promise<MasteryOverrideFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const parsed = masteryOverrideSchema.safeParse({
    skill_key: formData.get("skill_key"),
    level_id: formData.get("level_id"),
  });

  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await recordMasteryOverrideEvidence(supabase, user.id, {
      skillKey: parsed.data.skill_key,
      levelId: parsed.data.level_id,
    });
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Could not record mastery override.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath("/roadmap");
  revalidatePath("/export");
  revalidatePath("/reflect");
  return { success: true };
}
