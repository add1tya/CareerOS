import { NextResponse } from "next/server";

import { AiAdapterError } from "@/lib/ai/ai-adapter-types";
import {
  composeGapAnalysis,
  listGapReports,
  previewGapFacts,
} from "@/lib/gap-analysis/gap-analysis-service";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/gap-analysis — preview Gap Facts + Sections + recent reports (no LLM).
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
    const [preview, reports] = await Promise.all([
      previewGapFacts(supabase, user.id),
      listGapReports(supabase, user.id),
    ]);
    return NextResponse.json(
      { preview, reports },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load gap preview.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/gap-analysis — compose a new append-only gap report (ADR-0025).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const view = await composeGapAnalysis(supabase, user.id, {
      signal: request.signal,
    });
    return NextResponse.json(view, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gap analysis failed.";
    const code = err instanceof AiAdapterError ? err.code : "gap_analysis_failed";
    return NextResponse.json(
      { error: message, code },
      {
        status: err instanceof AiAdapterError ? 502 : 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
