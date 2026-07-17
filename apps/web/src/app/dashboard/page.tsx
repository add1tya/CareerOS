import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { DashboardPlaceholder } from "@/components/dashboard-placeholder";
import { DecisionInspector } from "@/components/decision-inspector";
import { ExecutionPanel } from "@/components/execution-panel";
import { RecommendationCard } from "@/components/recommendation-card";
import { SkillTreeInspector } from "@/components/skill-tree";
import {
  getCareerGraph,
  initializeCareerGraph,
} from "@/lib/career-graph-service";
import { getOrCreateCurrentRecommendation } from "@/lib/decision-engine/decision-engine-service";
import { getOrCreateExecutionPlan } from "@/lib/execution-engine/execution-engine-service";
import {
  getProfile,
  isOnboardingComplete,
} from "@/lib/profile-service";
import {
  generateSkillGraph,
  getSkillGraph,
} from "@/lib/skill-graph/skill-graph-service";
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

  // Backfill for users who onboarded before these sprints. Both are idempotent —
  // no-ops once their respective *_at flags are set.
  await initializeCareerGraph(supabase, user.id);
  await generateSkillGraph(supabase, user.id);

  const [careerGraph, skillGraph, decision] = await Promise.all([
    getCareerGraph(supabase, user.id),
    getSkillGraph(supabase, user.id),
    getOrCreateCurrentRecommendation(supabase, user.id),
  ]);

  // Execution plan is derived from the recommendation, so it runs after it.
  const executionPlan = await getOrCreateExecutionPlan(
    supabase,
    user.id,
    decision.recommendation,
  );

  return (
    <AppShell userEmail={user.email}>
      <DashboardPlaceholder
        displayName={profile?.display_name}
        careerGraph={careerGraph}
      />
      <div className="mt-6">
        <RecommendationCard recommendation={decision.recommendation} />
      </div>
      <ExecutionPanel result={executionPlan} />
      <DecisionInspector ranking={decision.ranking} />
      <SkillTreeInspector graph={skillGraph} />
    </AppShell>
  );
}
