/**
 * Export service (Sprint 11 / M11).
 *
 * Read-only ownership capability (Principle 27 / PR-19). Assembles a
 * CareerOsExport then hands it to a pure formatter. Writes nothing — no domain
 * mutation, no History event for export itself (ADR-0008).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { assembleExport } from "@/lib/export/export-assembler";
import { formatExportJson } from "@/lib/export/format-json";
import { formatExportMarkdown } from "@/lib/export/format-markdown";
import {
  EXPORT_SCHEMA_VERSION,
  type CareerOsExport,
  type ExportFormat,
} from "@/lib/export/export-types";

export type RenderedExport = {
  document: CareerOsExport;
  body: string;
  contentType: string;
  filename: string;
};

/** Assembles then formats. Fail-loud if assembly fails. */
export async function buildRenderedExport(
  supabase: SupabaseClient,
  userId: string,
  format: ExportFormat,
): Promise<RenderedExport> {
  const document = await assembleExport(supabase, userId);
  return renderExport(document, format);
}

/** Pure render step — formatters never touch the database. */
export function renderExport(
  document: CareerOsExport,
  format: ExportFormat,
): RenderedExport {
  const date = document.metadata.generated_at.slice(0, 10);
  if (format === "json") {
    return {
      document,
      body: formatExportJson(document),
      contentType: "application/json; charset=utf-8",
      filename: `careeros-export-v${EXPORT_SCHEMA_VERSION}-${date}.json`,
    };
  }
  return {
    document,
    body: formatExportMarkdown(document),
    contentType: "text/markdown; charset=utf-8",
    filename: `careeros-export-v${EXPORT_SCHEMA_VERSION}-${date}.md`,
  };
}

export function parseExportFormat(
  value: string | null,
): ExportFormat | null {
  if (value === null || value === "" || value === "markdown" || value === "md") {
    return "markdown";
  }
  if (value === "json") {
    return "json";
  }
  return null;
}
