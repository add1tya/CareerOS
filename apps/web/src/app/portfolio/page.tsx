import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { PortfolioIntelligencePanel } from "@/components/portfolio-intelligence-panel";
import {
  listPortfolioDrafts,
  previewPortfolioFacts,
} from "@/lib/portfolio-intelligence/portfolio-intelligence-service";
import { getProfile, isOnboardingComplete } from "@/lib/profile-service";
import { createClient } from "@/lib/supabase/server";

export default async function PortfolioPage() {
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
    previewPortfolioFacts(supabase, user.id),
    listPortfolioDrafts(supabase, user.id),
  ]);

  return (
    <AppShell userEmail={user.email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Portfolio Intelligence
          </h1>
          <p className="text-sm text-muted-foreground">
            Compose a proof-oriented technical portfolio from verified CareerOS
            facts. This is not Resume Intelligence and does not publish a
            website.
          </p>
        </div>
        <PortfolioIntelligencePanel
          initialPreview={preview}
          initialDrafts={drafts}
        />
      </div>
    </AppShell>
  );
}
