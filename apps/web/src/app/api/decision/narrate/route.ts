import { NextResponse } from "next/server";

import { AiAdapterError } from "@/lib/ai/ai-adapter-types";
import {
  getDecisionTraceNarrative,
  narrateDecisionTrace,
} from "@/lib/decision-engine/trace-narrator-service";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/decision/narrate?recommendationId=
 * Returns stored narrative or insufficient/missing status — no LLM.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const recommendationId = new URL(request.url).searchParams.get(
    "recommendationId",
  );
  if (!recommendationId) {
    return NextResponse.json(
      { error: "recommendationId is required." },
      { status: 400 },
    );
  }

  try {
    const view = await getDecisionTraceNarrative(
      supabase,
      user.id,
      recommendationId,
    );
    return NextResponse.json(view, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load narrative.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/decision/narrate
 * Body: { recommendationId }. Generates narrative via Adapter if missing.
 * Skips AI when Trace Facts are insufficient (ADR-0023).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { recommendationId?: unknown };
  try {
    body = (await request.json()) as { recommendationId?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body.recommendationId !== "string") {
    return NextResponse.json(
      { error: "recommendationId string is required." },
      { status: 400 },
    );
  }

  try {
    const view = await narrateDecisionTrace(
      supabase,
      user.id,
      body.recommendationId,
      { signal: request.signal },
    );
    return NextResponse.json(view, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Narration failed.";
    const code = err instanceof AiAdapterError ? err.code : "narrate_failed";
    return NextResponse.json(
      { error: message, code },
      {
        status: err instanceof AiAdapterError ? 502 : 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
