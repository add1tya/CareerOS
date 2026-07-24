import { NextResponse } from "next/server";

import { discoverCapability } from "@/lib/capabilities/capability-discovery";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/capabilities/[id] — single Capability Manifest by immutable id.
 */
export async function GET(_request: Request, context: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: rawId } = await context.params;
  // Next may pass dotted ids; support path segment or encoded.
  const id = decodeURIComponent(rawId ?? "");
  if (!id) {
    return NextResponse.json(
      { error: "Capability id required." },
      { status: 400 },
    );
  }

  const capability = discoverCapability(id);
  if (!capability) {
    return NextResponse.json(
      { error: `Capability "${id}" not found.` },
      { status: 404 },
    );
  }

  return NextResponse.json(
    { capability },
    { headers: { "Cache-Control": "no-store" } },
  );
}
