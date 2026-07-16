import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { OnboardingForm } from "@/components/onboarding-form";
import {
  getProfile,
  isOnboardingComplete,
} from "@/lib/profile-service";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile(supabase, user.id);
  if (isOnboardingComplete(profile)) {
    redirect("/dashboard");
  }

  return (
    <AppShell userEmail={user.email}>
      <OnboardingForm />
    </AppShell>
  );
}
