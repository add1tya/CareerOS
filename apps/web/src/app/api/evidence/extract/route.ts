import { NextResponse } from "next/server";

import { AiAdapterError } from "@/lib/ai/ai-adapter-types";
import { extractEvidenceFromArtifact } from "@/lib/evidence-extraction/extraction-service";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/evidence/extract
 * Runs evidence.extract via AI Adapter; stores immutable proposal session.
 * Does not write Evidence (ADR-0022).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { artifactText?: unknown };
  try {
    body = (await request.json()) as { artifactText?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body.artifactText !== "string") {
    return NextResponse.json(
      { error: "artifactText string is required." },
      { status: 400 },
    );
  }

  try {
    const result = await extractEvidenceFromArtifact(
      supabase,
      user.id,
      body.artifactText,
      { signal: request.signal },
    );
    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Evidence extraction failed.";
    const code = err instanceof AiAdapterError ? err.code : "extract_failed";
    return NextResponse.json(
      { error: message, code },
      {
        status: err instanceof AiAdapterError ? 502 : 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
