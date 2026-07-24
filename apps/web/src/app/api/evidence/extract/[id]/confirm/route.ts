import { NextResponse } from "next/server";

import { confirmExtraction } from "@/lib/evidence-extraction/extraction-service";
import type { AcceptedProposalRef } from "@/lib/evidence-extraction/extraction-types";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/evidence/extract/[id]/confirm
 * Commits selected proposal ids via Evidence Service. No LLM call.
 */
export async function POST(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  let body: { accepted?: unknown };
  try {
    body = (await request.json()) as { accepted?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!Array.isArray(body.accepted)) {
    return NextResponse.json(
      { error: "accepted must be an array of { proposalId, impliedMastery? }." },
      { status: 400 },
    );
  }

  const accepted: AcceptedProposalRef[] = [];
  for (const item of body.accepted) {
    if (
      typeof item !== "object" ||
      item === null ||
      typeof (item as { proposalId?: unknown }).proposalId !== "string"
    ) {
      return NextResponse.json(
        { error: "Each accepted item needs proposalId." },
        { status: 400 },
      );
    }
    const ref: AcceptedProposalRef = {
      proposalId: (item as { proposalId: string }).proposalId,
    };
    if (
      "impliedMastery" in item &&
      typeof (item as { impliedMastery?: unknown }).impliedMastery === "number"
    ) {
      ref.impliedMastery = (item as { impliedMastery: number }).impliedMastery;
    }
    accepted.push(ref);
  }

  try {
    await confirmExtraction(supabase, user.id, id, accepted);
    return NextResponse.json(
      { ok: true },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Confirm extraction failed.";
    return NextResponse.json(
      { error: message },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
