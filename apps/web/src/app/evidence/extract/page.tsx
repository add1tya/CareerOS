import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { EvidenceExtractionPanel } from "@/components/evidence-extraction-panel";
import { listExtractionSessions } from "@/lib/evidence-extraction/extraction-service";
import { getProfile, isOnboardingComplete } from "@/lib/profile-service";
import { createClient } from "@/lib/supabase/server";

export default async function EvidenceExtractPage() {
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

  const sessions = await listExtractionSessions(supabase, user.id);

  return (
    <AppShell userEmail={user.email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Evidence extraction
          </h1>
          <p className="text-sm text-muted-foreground">
            Turn unstructured learning artifacts into Evidence proposals. Nothing
            changes Mastery until you confirm.
          </p>
        </div>
        <EvidenceExtractionPanel
          initialSessions={sessions.map((s) => ({
            id: s.id,
            status: s.status,
            createdAt: s.createdAt,
            proposalCount: s.proposals.length,
          }))}
        />
      </div>
    </AppShell>
  );
}
