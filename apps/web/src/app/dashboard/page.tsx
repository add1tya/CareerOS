import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { DashboardPlaceholder } from "@/components/dashboard-placeholder";
import {
  getCareerGraph,
  initializeCareerGraph,
} from "@/lib/career-graph-service";
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

  // Backfill: initialize the Career Graph for users who onboarded before
  // Sprint 3. Idempotent — a no-op once career_graph_initialized_at is set.
  await initializeCareerGraph(supabase, user.id);
  const careerGraph = await getCareerGraph(supabase, user.id);

  return (
    <AppShell userEmail={user.email}>
      <DashboardPlaceholder
        displayName={profile?.display_name}
        careerGraph={careerGraph}
      />
    </AppShell>
  );
}
