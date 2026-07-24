import { NextResponse } from "next/server";

import { runAdapterDiagnostic } from "@/lib/ai/ai-adapter-service";
import { AiAdapterError } from "@/lib/ai/ai-adapter-types";
import { getProvenanceFromError } from "@/lib/ai/runtime/ai-runtime";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/ai/diagnostic
 *
 * Runs adapter.diagnostic through AI Runtime. Appends ai_invocations.
 * Does not touch Decision, Planning, Mastery, History, or Goal state (ADR-0020).
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
    const result = await runAdapterDiagnostic(supabase, user.id, {
      signal: request.signal,
    });
    return NextResponse.json(
      {
        output: result.output,
        provenance: result.provenance,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const provenance = getProvenanceFromError(err);
    const code =
      err instanceof AiAdapterError ? err.code : "diagnostic_failed";
    const message =
      err instanceof Error ? err.message : "Adapter diagnostic failed.";

    return NextResponse.json(
      {
        error: message,
        code,
        provenance,
      },
      {
        status: statusForCode(code),
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}

function statusForCode(code: string): number {
  if (code === "api_key_missing" || code === "unknown_provider") return 503;
  if (code === "validation_failed") return 502;
  if (code === "timeout") return 504;
  if (code === "cancelled") return 408;
  if (code === "provenance_persist_failed") return 500;
  return 500;
}
