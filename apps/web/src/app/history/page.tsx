import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { TimelineViewPanel } from "@/components/timeline-view";
import { listHistoryEvents } from "@/lib/history/history-service";
import { buildTimelineView } from "@/lib/history/timeline-view";
import { getProfile, isOnboardingComplete } from "@/lib/profile-service";
import { createClient } from "@/lib/supabase/server";

/**
 * Timeline View v1 (Sprint 20) — elevates /history.
 * History owns the event log; this page only projects it (ADR-0017).
 */
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
  const timeline = buildTimelineView(events);

  return (
    <AppShell userEmail={user.email}>
      <TimelineViewPanel timeline={timeline} />
    </AppShell>
  );
}
