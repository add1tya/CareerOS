import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { DashboardPlaceholder } from "@/components/dashboard-placeholder";
import { DecisionInspector } from "@/components/decision-inspector";
import { ExecutionPanel } from "@/components/execution-panel";
import { GoalExplorerPanel } from "@/components/goal-explorer";
import { GoalProgressPanel } from "@/components/goal-progress-panel";
import { OpportunityPanel } from "@/components/opportunity-panel";
import { RecommendationCard } from "@/components/recommendation-card";
import { RecoveryPanel } from "@/components/recovery-panel";
import { RiskPanel } from "@/components/risk-panel";
import { SkillRelationshipExplorer } from "@/components/skill-relationship-explorer";
import { SkillTreeInspector } from "@/components/skill-tree";
import {
  getCareerGraph,
  initializeCareerGraph,
} from "@/lib/career-graph-service";
import { getOrCreateCurrentRecommendation } from "@/lib/decision-engine/decision-engine-service";
import { getOrCreateExecutionPlan } from "@/lib/execution-engine/execution-engine-service";
import { buildGoalExplorerView } from "@/lib/goal/goal-explorer-view";
import {
  getProfile,
  isOnboardingComplete,
} from "@/lib/profile-service";
import { getOpportunityAssessment } from "@/lib/opportunity/opportunity-service";
import { getRoadmap } from "@/lib/planning/planning-service";
import { getGoalProgressExplanation } from "@/lib/progress/goal-progress-service";
import { getRecoveryState } from "@/lib/recovery/recovery-service";
import { getRiskAssessment } from "@/lib/risk/risk-service";
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

  const [
    careerGraph,
    skillGraph,
    decision,
    recovery,
    risk,
    opportunity,
    goalProgress,
    roadmap,
  ] = await Promise.all([
    getCareerGraph(supabase, user.id),
    getSkillGraph(supabase, user.id),
    getOrCreateCurrentRecommendation(supabase, user.id),
    getRecoveryState(supabase, user.id),
    getRiskAssessment(supabase, user.id),
    getOpportunityAssessment(supabase, user.id),
    getGoalProgressExplanation(supabase, user.id),
    getRoadmap(supabase, user.id),
  ]);

  // Projection from already-loaded Goal + Constraints + Current Roadmap (no
  // second Planning pass). Service getGoalExplorerView remains for other callers.
  const goalExplorer = buildGoalExplorerView({
    goal: careerGraph.rootGoal,
    constraint: careerGraph.constraint,
    roadmap,
  });

  // Execution plan is derived from the recommendation, so it runs after it.
  const executionPlan = await getOrCreateExecutionPlan(
    supabase,
    user.id,
    decision.recommendation,
  );

  return (
    <AppShell userEmail={user.email}>
      <RecoveryPanel state={recovery} />
      <RiskPanel assessment={risk} />
      <OpportunityPanel assessment={opportunity} />
      <GoalExplorerPanel view={goalExplorer} />
      <GoalProgressPanel explanation={goalProgress} />
      <DashboardPlaceholder
        displayName={profile?.display_name}
        careerGraph={careerGraph}
      />
      <div className="mt-6">
        <RecommendationCard
          recommendation={decision.recommendation}
          explanation={decision.explanation}
        />
      </div>
      <ExecutionPanel result={executionPlan} />
      <DecisionInspector ranking={decision.ranking} />
      <SkillRelationshipExplorer
        graph={skillGraph}
        roadmap={roadmap}
        initialSkillKey={decision.recommendation?.recommendedSkillKey ?? null}
      />
      <SkillTreeInspector graph={skillGraph} />
    </AppShell>
  );
}


