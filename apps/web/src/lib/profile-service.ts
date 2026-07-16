import type { SupabaseClient } from "@supabase/supabase-js";

import type { OnboardingPayload } from "@/lib/onboarding-schema";

export type Profile = {
  user_id: string;
  display_name: string;
  current_profession: string;
  target_role: string;
  timeline_months: number;
  available_hours_per_week: number;
  onboarding_completed_at: string | null;
  created_with_version: string;
  created_at: string;
  updated_at: string;
};

export async function getProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load profile: ${error.message}`);
  }

  return data as Profile | null;
}

export function isOnboardingComplete(profile: Profile | null): boolean {
  return Boolean(profile?.onboarding_completed_at);
}

export async function completeOnboarding(
  supabase: SupabaseClient,
  userId: string,
  payload: OnboardingPayload,
): Promise<Profile> {
  const row = {
    user_id: userId,
    display_name: payload.display_name,
    current_profession: payload.current_profession,
    target_role: payload.target_role,
    timeline_months: payload.timeline_months,
    available_hours_per_week: payload.available_hours_per_week,
    onboarding_completed_at: new Date().toISOString(),
    created_with_version: "v1",
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(row, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to save onboarding: ${error.message}`);
  }

  return data as Profile;
}
