import { NextResponse } from "next/server";

import { getAiAdapterStatus } from "@/lib/ai/ai-adapter-service";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/ai/status
 *
 * Config-only: provider id, adapter version, key present? — no model call.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(getAiAdapterStatus(), {
    headers: { "Cache-Control": "no-store" },
  });
}
