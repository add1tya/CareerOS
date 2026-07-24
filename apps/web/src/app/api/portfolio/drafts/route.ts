import { NextResponse } from "next/server";

import { listPortfolioDrafts } from "@/lib/portfolio-intelligence/portfolio-intelligence-service";
import { createClient } from "@/lib/supabase/server";

/** GET /api/portfolio/drafts */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const drafts = await listPortfolioDrafts(supabase, user.id);
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
