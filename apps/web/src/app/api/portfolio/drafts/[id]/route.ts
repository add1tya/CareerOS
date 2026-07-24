import { NextResponse } from "next/server";

import {
  formatPortfolioHtml,
  formatPortfolioMarkdown,
} from "@/lib/portfolio-intelligence/portfolio-export";
import { getPortfolioDraft } from "@/lib/portfolio-intelligence/portfolio-intelligence-service";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/portfolio/drafts/[id]
 * Optional ?format=md|html for deterministic export.
 */
export async function GET(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Draft id required." }, { status: 400 });
  }

  try {
    const view = await getPortfolioDraft(supabase, user.id, id);
    if (view.status === "missing" || !view.draft) {
      return NextResponse.json({ error: "Draft not found." }, { status: 404 });
    }

    const format = new URL(request.url).searchParams.get("format");
    if (format === "md") {
      const body = formatPortfolioMarkdown(view.draft);
      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="portfolio-${id.slice(0, 8)}.md"`,
          "Cache-Control": "no-store",
        },
      });
    }
    if (format === "html") {
      const body = formatPortfolioHtml(view.draft);
      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="portfolio-${id.slice(0, 8)}.html"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json(view, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load draft.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
