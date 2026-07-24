/**
 * Gap View — presentation projection (ADR-0025).
 */

import type {
  GapFacts,
  GapReport,
  GapSections,
  GapView,
} from "@/lib/gap-analysis/gap-analysis-types";

export function buildGapView(args: {
  status: GapView["status"];
  insufficientReason?: string | null;
  facts?: GapFacts | null;
  sections?: GapSections | null;
  report?: GapReport | null;
  reportId?: string | null;
  createdAt?: string | null;
}): GapView {
  return {
    status: args.status,
    insufficientReason: args.insufficientReason ?? null,
    facts: args.facts ?? null,
    sections: args.sections ?? null,
    report: args.report ?? null,
    reportId: args.reportId ?? null,
    createdAt: args.createdAt ?? null,
    note:
      "Gap Analysis summarizes current CareerOS facts. It does not plan, predict, or write back to the Career Graph.",
  };
}
