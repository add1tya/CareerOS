/**
 * Career Graph Initialization (Sprint 3 / M3).
 *
 * Turns saved onboarding answers into the smallest real Career Graph:
 * one root Goal + one Constraint row. This is deliberately deterministic
 * and idempotent — no Skill Graph, no recommendations, no Claude.
 *
 * Idempotency (AR): `profiles.career_graph_initialized_at` is the guard.
 * If it is set, initialization has already run and we do nothing.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { getProfile, type Profile } from "@/lib/profile-service";

export type Goal = {
  id: string;
  user_id: string;
  parent_goal_id: string | null;
  title: string;
  deadline: string | null;
  status: "active" | "completed" | "paused" | "archived" | "cancelled";
  source: string;
  created_at: string;
  updated_at: string;
};

export type ConstraintRow = {
  user_id: string;
  available_hours_per_week: number;
  last_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CareerGraph = {
  rootGoal: Goal | null;
  constraint: ConstraintRow | null;
};

function isInitialized(profile: Profile | null): boolean {
  return Boolean(profile?.career_graph_initialized_at);
}

/**
 * Computes a target deadline from the onboarding timeline. Kept as a plain
 * date (no time component) since goals track calendar deadlines, not moments.
 */
function deadlineFromTimeline(timelineMonths: number): string {
  const deadline = new Date();
  deadline.setMonth(deadline.getMonth() + timelineMonths);
  return deadline.toISOString().slice(0, 10);
}

/**
 * Idempotently creates the initial Career Graph for a user from their profile.
 * Safe to call more than once: after the first successful run it is a no-op.
 */
export async function initializeCareerGraph(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const profile = await getProfile(supabase, userId);

  if (!profile) {
    throw new Error("Cannot initialize Career Graph before onboarding.");
  }

  if (isInitialized(profile)) {
    return;
  }

  const { error: goalError } = await supabase.from("goals").insert({
    user_id: userId,
    parent_goal_id: null,
    title: `Become a ${profile.target_role}`,
    deadline: deadlineFromTimeline(profile.timeline_months),
    status: "active",
    source: "system",
  });

  if (goalError) {
    throw new Error(`Failed to create root goal: ${goalError.message}`);
  }

  const { error: constraintError } = await supabase.from("constraints").upsert(
    {
      user_id: userId,
      available_hours_per_week: profile.available_hours_per_week,
      last_confirmed_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (constraintError) {
    throw new Error(
      `Failed to create constraints: ${constraintError.message}`,
    );
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ career_graph_initialized_at: new Date().toISOString() })
    .eq("user_id", userId);

  if (profileError) {
    throw new Error(
      `Failed to mark Career Graph initialized: ${profileError.message}`,
    );
  }
}

/**
 * Loads the initialized Career Graph for display. Returns the single root
 * goal (Sprint 3 creates exactly one) and the user's constraint row.
 */
export async function getCareerGraph(
  supabase: SupabaseClient,
  userId: string,
): Promise<CareerGraph> {
  const [{ data: goal, error: goalError }, { data: constraint, error: constraintError }] =
    await Promise.all([
      supabase
        .from("goals")
        .select("*")
        .eq("user_id", userId)
        .is("parent_goal_id", null)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("constraints")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

  if (goalError) {
    throw new Error(`Failed to load goal: ${goalError.message}`);
  }
  if (constraintError) {
    throw new Error(`Failed to load constraints: ${constraintError.message}`);
  }

  return {
    rootGoal: (goal as Goal | null) ?? null,
    constraint: (constraint as ConstraintRow | null) ?? null,
  };
}
