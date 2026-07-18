"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { completeTaskAndAdvance } from "@/lib/execution-engine/execution-engine-service";
import { recordTaskCompletionEvidence } from "@/lib/skill-graph/evidence/evidence-service";
import { createClient } from "@/lib/supabase/server";

/**
 * Marks a Task complete — the ONLY user-driven execution action in V1.
 *
 * This bridges two independent subsystems: the Execution Engine advances
 * Quest/Mission state and returns a completion signal, which we forward to the
 * Evidence subsystem to produce Evidence and update Mastery/Confidence/status.
 * The Execution Engine itself contains no learning logic (deterministic; no AI).
 */
export async function completeTask(formData: FormData): Promise<void> {
  const taskId = formData.get("taskId");
  if (typeof taskId !== "string" || taskId.length === 0) {
    return;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const signal = await completeTaskAndAdvance(supabase, user.id, taskId);
  if (signal) {
    await recordTaskCompletionEvidence(supabase, user.id, {
      taskId: signal.taskId,
      skillKey: signal.skillKey,
    });
  }

  revalidatePath("/dashboard");
}
