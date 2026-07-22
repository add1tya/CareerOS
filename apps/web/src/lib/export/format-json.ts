/**
 * JSON export formatter (Sprint 11 / M11) — PURE.
 *
 * Transforms an already-assembled CareerOsExport into stable JSON.
 * No database access. Top-level keys follow EXPORT_SECTION_ORDER (ADR-0008).
 * Within EXPORT_SCHEMA_VERSION, field names/structure remain stable (refinement 5).
 */
import {
  EXPORT_SECTION_ORDER,
  type CareerOsExport,
} from "@/lib/export/export-types";

/**
 * Serializes the export document with deterministic top-level key order.
 * Uses JSON.stringify with a 2-space indent for human skim-ability of the
 * machine format.
 */
export function formatExportJson(doc: CareerOsExport): string {
  // Rebuild as an insertion-ordered object matching EXPORT_SECTION_ORDER so
  // key order is stable across engines that preserve string-key insertion order.
  const ordered: Record<string, unknown> = {};
  for (const section of EXPORT_SECTION_ORDER) {
    ordered[section] = doc[section];
  }
  return `${JSON.stringify(ordered, null, 2)}\n`;
}
