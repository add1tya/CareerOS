import { NextResponse } from "next/server";

import { AiAdapterError } from "@/lib/ai/ai-adapter-types";
import {
  composePortfolioDraft,
  listPortfolioDrafts,
  previewPortfolioFacts,
} from "@/lib/portfolio-intelligence/portfolio-intelligence-service";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/portfolio/compose — preview Facts + Sections + recent drafts (no LLM).
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
    const [preview, drafts] = await Promise.all([
      previewPortfolioFacts(supabase, user.id),
      listPortfolioDrafts(supabase, user.id),
    ]);
    return NextResponse.json(
      { preview, drafts },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load portfolio preview.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/portfolio/compose — compose immutable portfolio draft (ADR-0028).
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
    const view = await composePortfolioDraft(supabase, user.id, {
      signal: request.signal,
    });
    return NextResponse.json(view, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Portfolio compose failed.";
    const code =
      err instanceof AiAdapterError ? err.code : "compose_failed";
    return NextResponse.json(
      { error: message, code },
      {
        status: err instanceof AiAdapterError ? 502 : 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
