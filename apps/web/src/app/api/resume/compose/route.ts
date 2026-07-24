import { NextResponse } from "next/server";

import { AiAdapterError } from "@/lib/ai/ai-adapter-types";
import {
  composeResumeDraft,
  listResumeDrafts,
  previewResumeFacts,
} from "@/lib/resume-intelligence/resume-intelligence-service";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/resume/compose
 * Preview Resume Facts + Sections (no LLM). Also lists recent drafts.
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
      previewResumeFacts(supabase, user.id),
      listResumeDrafts(supabase, user.id),
    ]);
    return NextResponse.json(
      { preview, drafts },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load resume preview.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/resume/compose
 * Compose a new append-only resume draft via Adapter (ADR-0024).
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
    const view = await composeResumeDraft(supabase, user.id, {
      signal: request.signal,
    });
    return NextResponse.json(view, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Resume compose failed.";
    const code = err instanceof AiAdapterError ? err.code : "compose_failed";
    return NextResponse.json(
      { error: message, code },
      {
        status: err instanceof AiAdapterError ? 502 : 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
