import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { HistoryTimeline } from "@/components/history-timeline";
import { listHistoryEvents } from "@/lib/history/history-service";
import { getProfile, isOnboardingComplete } from "@/lib/profile-service";
import { createClient } from "@/lib/supabase/server";

export default async function HistoryPage() {
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

  const events = await listHistoryEvents(supabase, user.id, { limit: 100 });

  return (
    <AppShell userEmail={user.email}>
      <HistoryTimeline events={events} />
    </AppShell>
  );
}
