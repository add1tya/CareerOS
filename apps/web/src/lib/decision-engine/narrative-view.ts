/**
 * Narrative View — presentation projection (ADR-0023).
 */

import type {
  NarrativeFacts,
  NarrativeView,
} from "@/lib/decision-engine/trace-narrator-types";

export function buildNarrativeView(args: {
  recommendationId: string;
  status: NarrativeView["status"];
  insufficientReason?: string | null;
  narrative?: NarrativeFacts | null;
  createdAt?: string | null;
}): NarrativeView {
  return {
    recommendationId: args.recommendationId,
    status: args.status,
    insufficientReason: args.insufficientReason ?? null,
    narrative: args.narrative ?? null,
    note:
      "AI wording of the stored decision snapshot. Structured facts above remain authoritative — this does not change the recommendation.",
    createdAt: args.createdAt ?? null,
  };
}
