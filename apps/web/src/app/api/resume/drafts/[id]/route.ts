import { NextResponse } from "next/server";

import { getResumeDraft } from "@/lib/resume-intelligence/resume-intelligence-service";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/resume/drafts/[id] — load one immutable draft + facts/sections.
 */
export async function GET(_request: Request, context: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Draft id required." }, { status: 400 });
  }

  try {
    const view = await getResumeDraft(supabase, user.id, id);
    if (view.status === "missing") {
      return NextResponse.json({ error: "Draft not found." }, { status: 404 });
    }
    return NextResponse.json(view, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load draft.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
