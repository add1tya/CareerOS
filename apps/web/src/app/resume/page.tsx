import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { ResumeIntelligencePanel } from "@/components/resume-intelligence-panel";
import {
  listResumeDrafts,
  previewResumeFacts,
} from "@/lib/resume-intelligence/resume-intelligence-service";
import { getProfile, isOnboardingComplete } from "@/lib/profile-service";
import { createClient } from "@/lib/supabase/server";

export default async function ResumePage() {
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

  const [preview, drafts] = await Promise.all([
    previewResumeFacts(supabase, user.id),
    listResumeDrafts(supabase, user.id),
  ]);

  return (
    <AppShell userEmail={user.email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Resume Intelligence
          </h1>
          <p className="text-sm text-muted-foreground">
            Compose grounded resume prose from verified CareerOS facts. This is
            not Export — drafts never invent experience or write back to your
            graph.
          </p>
        </div>
        <ResumeIntelligencePanel
          initialPreview={preview}
          initialDrafts={drafts}
        />
      </div>
    </AppShell>
  );
}
