/**
 * Recovery panel (Sprint 13 / M13) — UI-only projection surface.
 *
 * Answers: "I've been away — what should I know, and what's next?"
 * Recovery never mutates ranking, suppression, mastery, or missions.
 * Tone: honest re-engagement, never shame or streak guilt (Principle 5 / 21).
 */
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RecoveryState } from "@/lib/recovery/recovery-types";

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function RecoveryPanel({ state }: { state: RecoveryState }) {
  if (state.status !== "absent") {
    return null;
  }

  const days = state.daysSinceLastActivity ?? state.absenceThresholdDays;

  return (
    <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
      <CardHeader>
        <CardTitle className="text-lg">Welcome back</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-foreground">
          It has been about <span className="font-medium">{days} day{days === 1 ? "" : "s"}</span>{" "}
          since your last recorded activity
          {state.lastQualifyingEventAt
            ? ` (${formatWhen(state.lastQualifyingEventAt)}`
            : ""}
          {state.lastQualifyingEventType
            ? ` — ${state.lastQualifyingEventType})`
            : state.lastQualifyingEventAt
              ? ")"
              : ""}
          .
        </p>
        <p className="text-muted-foreground">
          Missed time is new information about the plan&apos;s assumptions — not
          a failure. Your Skill Graph, Evidence, and Mission history are
          unchanged. The recommendation and roadmap below are recomputed from
          current facts when you continue.
        </p>
        <p className="text-xs text-muted-foreground">
          Recovery policy v{state.recoveryPolicyVersion} · threshold{" "}
          {state.absenceThresholdDays} days · projection over History only
        </p>
        <p className="text-sm">
          <Link href="/roadmap" className="underline underline-offset-2">
            Review your roadmap
          </Link>
          {" · "}
          <Link href="/history" className="underline underline-offset-2">
            See what was recorded
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
