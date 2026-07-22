/**
 * Constraint hours update — minimal fact channel for Opportunity Assessment
 * (Sprint 16 / M16).
 *
 * Exists only so the founder can produce a qualifying `constraint_updated`
 * History event. Not a general constraint-management subsystem (ADR-0013).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  appendHistoryEvent,
  newCorrelationId,
} from "@/lib/history/history-service";

export type UpdateAvailableHoursInput = {
  availableHoursPerWeek: number;
  correlationId?: string;
};

/**
 * Updates constraints + profile weekly hours and appends History.
 * entity_id is the user's id (constraints PK = user_id).
 */
export async function updateAvailableHours(
  supabase: SupabaseClient,
  userId: string,
  input: UpdateAvailableHoursInput,
): Promise<void> {
  const hours = input.availableHoursPerWeek;
  if (!Number.isInteger(hours) || hours < 1 || hours > 80) {
    throw new Error("Available hours must be an integer from 1 to 80.");
  }

  const { data: existing, error: loadError } = await supabase
    .from("constraints")
    .select("available_hours_per_week")
    .eq("user_id", userId)
    .maybeSingle();

  if (loadError) {
    throw new Error(`Failed to load constraints: ${loadError.message}`);
  }
  if (!existing) {
    throw new Error("Constraints not initialized — complete onboarding first.");
  }

  const previousHours = existing.available_hours_per_week as number;
  if (previousHours === hours) {
    return;
  }

  const confirmedAt = new Date().toISOString();

  const { error: constraintError } = await supabase
    .from("constraints")
    .update({
      available_hours_per_week: hours,
      last_confirmed_at: confirmedAt,
    })
    .eq("user_id", userId);

  if (constraintError) {
    throw new Error(`Failed to update constraints: ${constraintError.message}`);
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ available_hours_per_week: hours })
    .eq("user_id", userId);

  if (profileError) {
    throw new Error(`Failed to update profile hours: ${profileError.message}`);
  }

  await appendHistoryEvent(supabase, userId, {
    eventType: "constraint_updated",
    entityKind: "constraint",
    entityId: userId,
    correlationId: input.correlationId ?? newCorrelationId(),
    actor: "user",
    payload: {
      previous_hours_per_week: previousHours,
      new_hours_per_week: hours,
    },
  });
}
