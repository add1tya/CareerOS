import {
  confirmReflectionAction,
  declineReflectionAction,
} from "@/app/reflect/actions";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TIER_CONFIDENCE_CEILING } from "@/lib/skill-graph/evidence/evidence-types";
import type { Reflection } from "@/lib/reflection/reflection-types";
import { cn } from "@/lib/utils";

/**
 * A pending (proposed) reflection awaiting the user's decision. Confirming
 * commits the proposed update as Evidence; declining preserves it as signal.
 */
export function ReflectionProposal({
  reflection,
  skillName,
}: {
  reflection: Reflection;
  skillName: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>Proposed update — needs your confirmation</CardDescription>
        <CardTitle className="text-lg">{skillName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border p-3 text-sm">
          <p className="text-muted-foreground">{reflection.promptShown}</p>
          {reflection.responseText ? (
            <p className="mt-2 text-foreground">
              &ldquo;{reflection.responseText}&rdquo;
            </p>
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">
            You reflected while this skill was at Mastery{" "}
            {reflection.evaluatedMastery.toFixed(2)} · Confidence{" "}
            {reflection.evaluatedConfidence.toFixed(2)} ({reflection.evaluatedStatus}).
          </p>
        </div>

        <ul className="space-y-2">
          {reflection.derivedUpdates.map((update, index) => (
            <li key={index} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">
                Record reflection evidence (implied mastery{" "}
                {update.impliedMastery.toFixed(2)})
              </p>
              <p className="mt-1 text-muted-foreground">{update.rationale}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Tier-2 (Artifact) evidence — raises Confidence up to ~
                {TIER_CONFIDENCE_CEILING[update.tier].toFixed(2)}. Confidence is
                never fully verified by self-assessment.
              </p>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <form action={confirmReflectionAction}>
            <input type="hidden" name="reflection_id" value={reflection.id} />
            <button
              type="submit"
              className={cn(buttonVariants({ variant: "default", size: "sm" }))}
            >
              Confirm update
            </button>
          </form>
          <form action={declineReflectionAction}>
            <input type="hidden" name="reflection_id" value={reflection.id} />
            <button
              type="submit"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Decline
            </button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
