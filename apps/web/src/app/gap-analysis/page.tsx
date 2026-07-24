import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { GapAnalysisPanel } from "@/components/gap-analysis-panel";
import {
  listGapReports,
  previewGapFacts,
} from "@/lib/gap-analysis/gap-analysis-service";
import { getProfile, isOnboardingComplete } from "@/lib/profile-service";
import { createClient } from "@/lib/supabase/server";

export default async function GapAnalysisPage() {
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

  const [preview, reports] = await Promise.all([
    previewGapFacts(supabase, user.id),
    listGapReports(supabase, user.id),
  ]);

  return (
    <AppShell userEmail={user.email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Career Gap Analysis
          </h1>
          <p className="text-sm text-muted-foreground">
            Summarize verified strengths, missing evidence, and weak mastery
            from current CareerOS facts. This does not plan, predict, or change
            your graph.
          </p>
        </div>
        <GapAnalysisPanel initialPreview={preview} initialReports={reports} />
      </div>
    </AppShell>
  );
}
