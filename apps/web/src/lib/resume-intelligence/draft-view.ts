/**
 * Resume View — presentation projection (ADR-0024).
 */

import type {
  ResumeDraft,
  ResumeFacts,
  ResumeSections,
  ResumeView,
} from "@/lib/resume-intelligence/resume-intelligence-types";

export function buildResumeView(args: {
  status: ResumeView["status"];
  insufficientReason?: string | null;
  facts?: ResumeFacts | null;
  sections?: ResumeSections | null;
  draft?: ResumeDraft | null;
  draftId?: string | null;
  createdAt?: string | null;
}): ResumeView {
  return {
    status: args.status,
    insufficientReason: args.insufficientReason ?? null,
    facts: args.facts ?? null,
    sections: args.sections ?? null,
    draft: args.draft ?? null,
    draftId: args.draftId ?? null,
    createdAt: args.createdAt ?? null,
    note:
      "Resume Intelligence composes CareerOS facts into prose. Export remains the ownership dump. Drafts never write back to the Career Graph.",
  };
}
