import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

import {
  getProfile,
  isOnboardingComplete,
} from "@/lib/profile-service";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile(supabase, user.id);
  redirect(isOnboardingComplete(profile) ? "/dashboard" : "/onboarding");
}
