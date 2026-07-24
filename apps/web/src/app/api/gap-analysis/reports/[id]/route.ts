import { NextResponse } from "next/server";

import { getGapReport } from "@/lib/gap-analysis/gap-analysis-service";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/gap-analysis/reports/[id] — load one immutable report.
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
    return NextResponse.json({ error: "Report id required." }, { status: 400 });
  }

  try {
    const view = await getGapReport(supabase, user.id, id);
    if (view.status === "missing" && !view.report) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }
    return NextResponse.json(view, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load report.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
