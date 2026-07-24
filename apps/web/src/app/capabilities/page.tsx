import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { CapabilitiesPanel } from "@/components/capabilities-panel";
import {
  discoverCapabilities,
  discoverRegistryInfo,
} from "@/lib/capabilities/capability-discovery";
import { getProfile, isOnboardingComplete } from "@/lib/profile-service";
import { createClient } from "@/lib/supabase/server";

/**
 * Capabilities discovery UI (ADR-0027).
 * Answers: "What capabilities does CareerOS expose, and are they read-only?"
 */
export default async function CapabilitiesPage() {
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

  const capabilities = discoverCapabilities();
  const info = discoverRegistryInfo();

  return (
    <AppShell userEmail={user.email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Capabilities</h1>
          <p className="text-sm text-muted-foreground">
            Deterministic catalog of CareerOS capability manifests. Metadata
            only — this page does not execute tools or change your Career Graph.
          </p>
        </div>
        <CapabilitiesPanel capabilities={capabilities} info={info} />
      </div>
    </AppShell>
  );
}
