import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { RoadmapView } from "@/components/roadmap-view";
import { getRoadmap } from "@/lib/planning/planning-service";
import { getProfile, isOnboardingComplete } from "@/lib/profile-service";
import { generateSkillGraph } from "@/lib/skill-graph/skill-graph-service";
import { createClient } from "@/lib/supabase/server";

export default async function RoadmapPage() {
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

  // Idempotent backfill so the Roadmap works even if this page is visited before
  // the dashboard (no-op once the Skill Graph overlay exists).
  await generateSkillGraph(supabase, user.id);

  const roadmap = await getRoadmap(supabase, user.id);

  return (
    <AppShell userEmail={user.email}>
      <RoadmapView
        roadmap={roadmap}
        weeklyHours={profile?.available_hours_per_week ?? null}
      />
    </AppShell>
  );
}
