import { NextResponse } from "next/server";

import {
  buildRenderedExport,
  parseExportFormat,
} from "@/lib/export/export-service";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/export?format=markdown|json
 *
 * Authenticated download of the user's CareerOS data export.
 * Read-only — does not write domain state or History events (ADR-0008).
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const format = parseExportFormat(url.searchParams.get("format"));
  if (!format) {
    return NextResponse.json(
      { error: "Invalid format. Use markdown or json." },
      { status: 400 },
    );
  }

  try {
    const rendered = await buildRenderedExport(supabase, user.id, format);
    return new NextResponse(rendered.body, {
      status: 200,
      headers: {
        "Content-Type": rendered.contentType,
        "Content-Disposition": `attachment; filename="${rendered.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to build export.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
