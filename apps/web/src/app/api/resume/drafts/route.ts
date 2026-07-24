import { NextResponse } from "next/server";

import { listResumeDrafts } from "@/lib/resume-intelligence/resume-intelligence-service";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/resume/drafts — list recent immutable drafts.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const drafts = await listResumeDrafts(supabase, user.id);
    return NextResponse.json(
      { drafts },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list drafts.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
