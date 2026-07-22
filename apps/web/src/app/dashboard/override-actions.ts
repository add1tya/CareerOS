"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getOrCreateCurrentRecommendation } from "@/lib/decision-engine/decision-engine-service";
import { skipTaskAndAdvance } from "@/lib/execution-engine/execution-engine-service";
import { newCorrelationId } from "@/lib/history/history-service";
import {
  overrideRecommendationSchema,
  skipTaskSchema,
} from "@/lib/override/override-schema";
import {
  overrideRecommendation,
  recordTaskSkipOverride,
} from "@/lib/override/override-service";
import { createClient } from "@/lib/supabase/server";

export type OverrideFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

/**
 * Records a recommendation override (append-only signal), then recomputes the
 * Decision Engine recommendation with derived suppression. Never mutates
 * existing Mission rows.
 */
export async function overrideRecommendationAction(
  _prevState: OverrideFormState,
  formData: FormData,
): Promise<OverrideFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const parsed = overrideRecommendationSchema.safeParse({
    recommendation_id: formData.get("recommendation_id"),
    reason_code: formData.get("reason_code"),
    reason_text: formData.get("reason_text") ?? "",
  });

  if (!parsed.success) {
    return {
      error: "Please choose a reason.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await overrideRecommendation(supabase, user.id, parsed.data);
    // Recompute so the next-best (non-suppressed) skill is persisted.
    await getOrCreateCurrentRecommendation(supabase, user.id);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not record override.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/roadmap");
  revalidatePath("/history");
  revalidatePath("/export");
  return {};
}

/**
 * Skips a task: Execution marks it skipped (no Evidence); Override subsystem
 * appends the signal + History event.
 */
export async function skipTaskAction(
  _prevState: OverrideFormState,
  formData: FormData,
): Promise<OverrideFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const parsed = skipTaskSchema.safeParse({
    task_id: formData.get("task_id"),
    reason_code: formData.get("reason_code"),
    reason_text: formData.get("reason_text") ?? "",
  });

  if (!parsed.success) {
    return {
      error: "Please choose a reason.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const correlationId = newCorrelationId();
    const signal = await skipTaskAndAdvance(
      supabase,
      user.id,
      parsed.data.task_id,
      correlationId,
    );
    if (signal) {
      await recordTaskSkipOverride(supabase, user.id, {
        taskId: signal.taskId,
        skillKey: signal.skillKey,
        reasonCode: parsed.data.reason_code,
        reasonText: parsed.data.reason_text ?? null,
        correlationId: signal.correlationId,
      });
    }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not skip task.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath("/roadmap");
  revalidatePath("/export");
  return {};
}
