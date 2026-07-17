"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { completeTaskAndAdvance } from "@/lib/execution-engine/execution-engine-service";
import { createClient } from "@/lib/supabase/server";

/**
 * Marks a Task complete. This is the ONLY user-driven execution action in V1.
 * Deterministic Quest/Mission advancement (lazy next-quest generation) happens
 * server-side inside completeTaskAndAdvance — no evidence, mastery, XP, or AI.
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

  await completeTaskAndAdvance(supabase, user.id, taskId);

  revalidatePath("/dashboard");
}
