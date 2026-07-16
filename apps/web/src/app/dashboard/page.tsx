import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { DashboardPlaceholder } from "@/components/dashboard-placeholder";
import {
  getProfile,
  isOnboardingComplete,
} from "@/lib/profile-service";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile(supabase, user.id);
  if (!isOnboardingComplete(profile)) {
    redirect("/onboarding");
  }

  return (
    <AppShell userEmail={user.email}>
      <DashboardPlaceholder displayName={profile?.display_name} />
    </AppShell>
  );
}
