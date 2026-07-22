/**
 * Opportunity panel (Sprint 16 / M16) — UI-only projection surface.
 *
 * Answers: what changed, why it matters, what is now possible.
 * Shown only when assessment is active. Never mutates Decision, Roadmap,
 * suppression, mastery, or missions. Avoids recommendation-style wording.
 */
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OpportunityAssessment } from "@/lib/opportunity/opportunity-types";

export function OpportunityPanel({
  assessment,
}: {
  assessment: OpportunityAssessment;
}) {
  if (!assessment.isActive) {
    return null;
  }

  return (
    <Card className="mb-6 border-emerald-600/30 bg-emerald-600/5">
      <CardHeader>
        <CardTitle className="text-lg">Opportunity assessment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          Deterministic projection from a Constraint change, History, and
          Planning remaining effort — capacity signal only. Rankings and
          missions are unchanged.
        </p>

        {assessment.whatChanged ? (
          <div>
            <p className="font-medium">What changed</p>
            <p className="mt-1 text-muted-foreground">{assessment.whatChanged}</p>
          </div>
        ) : null}

        {assessment.whyItMatters ? (
          <div>
            <p className="font-medium">Why it matters</p>
            <p className="mt-1 text-muted-foreground">{assessment.whyItMatters}</p>
          </div>
        ) : null}

        {assessment.whatIsNowPossible ? (
          <div>
            <p className="font-medium">What is now possible</p>
            <p className="mt-1 text-muted-foreground">
              {assessment.whatIsNowPossible}
            </p>
          </div>
        ) : null}

        <p className="text-xs text-muted-foreground">
          Opportunity policy v{assessment.opportunityPolicyVersion} · confidence{" "}
          {assessment.confidence} · assessed{" "}
          {new Date(assessment.assessedAt).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>

        <p className="text-sm">
          <Link href="/roadmap" className="underline underline-offset-2">
            View current roadmap
          </Link>{" "}
          (unchanged by this assessment)
        </p>
      </CardContent>
    </Card>
  );
}
