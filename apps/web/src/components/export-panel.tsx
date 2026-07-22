/**
 * Export panel (Sprint 11 / M11) — download CareerOS data.
 *
 * Answers: "Can I take my career data with me?"
 * Links to the authenticated GET /api/export endpoint (Markdown + JSON).
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EXPORT_SCHEMA_VERSION } from "@/lib/export/export-types";

export function ExportPanel() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Export</h1>
        <p className="text-sm text-muted-foreground">
          Download your CareerOS data in a plain, readable format. You own this
          data — the export includes your profile, career graph, skill graph,
          execution records, evidence, reflections, history, and a labeled
          point-in-time Roadmap snapshot. Nothing is invented; computed sections
          are marked as computed.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Download (schema v{EXPORT_SCHEMA_VERSION})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Markdown is the human-readable primary format. JSON is the stable
            machine-readable companion. Both are assembled from the same
            document; within a schema version, field names stay fixed.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="/api/export?format=markdown"
              className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Download Markdown
            </a>
            <a
              href="/api/export?format=json"
              className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
            >
              Download JSON
            </a>
          </div>
          <ul className="list-inside list-disc text-xs text-muted-foreground">
            <li>No secrets (auth tokens) are included.</li>
            <li>History covers events since the History log shipped — no backfill.</li>
            <li>Export does not write a History event or store a copy on the server.</li>
            <li>Import / restore from an export file is not supported yet.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
