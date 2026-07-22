"use client";

import { useActionState } from "react";

import {
  recordMasteryOverrideAction,
  type MasteryOverrideFormState,
} from "@/app/dashboard/mastery-override-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  MASTERY_OVERRIDE_LEVEL_IDS,
  MASTERY_OVERRIDE_SCALE,
} from "@/lib/skill-graph/evidence/evidence-types";

const initialState: MasteryOverrideFormState = {};

const selectClassName =
  "border-input bg-background h-9 w-full rounded-lg border px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export type CorrectableSkill = {
  skillKey: string;
  name: string;
  mastery: number;
  confidence: number;
  status: string;
};

function FieldError({
  errors,
  name,
}: {
  errors?: Record<string, string[]>;
  name: string;
}) {
  const message = errors?.[name]?.[0];
  if (!message) return null;
  return (
    <p className="text-sm text-destructive" role="alert">
      {message}
    </p>
  );
}

/**
 * Skill-centric mastery correction. Submits immediately as Evidence — not a
 * Reflection proposal. Labels stay in the UI; the server maps level_id → number.
 */
export function MasteryOverrideForm({ skills }: { skills: CorrectableSkill[] }) {
  const [state, formAction, isPending] = useActionState(
    recordMasteryOverrideAction,
    initialState,
  );

  if (skills.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No unlocked skills to correct yet. Unlock a skill via prerequisites
        first.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Disagree with a skill&apos;s Mastery estimate? Record a self-report
        override. It is Evidence (Tier 1) — weighted into the estimate, not an
        overwrite. Confidence stays independent and capped by Evidence tier.
      </p>

      <div className="space-y-2">
        <Label htmlFor="mastery_override_skill_key">Skill</Label>
        <select
          id="mastery_override_skill_key"
          name="skill_key"
          required
          defaultValue={skills[0]?.skillKey}
          className={selectClassName}
        >
          {skills.map((skill) => (
            <option key={skill.skillKey} value={skill.skillKey}>
              {skill.name} — mastery {skill.mastery.toFixed(2)}, confidence{" "}
              {skill.confidence.toFixed(2)} ({skill.status})
            </option>
          ))}
        </select>
        <FieldError errors={state.fieldErrors} name="skill_key" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="mastery_override_level_id">Your assessment</Label>
        <select
          id="mastery_override_level_id"
          name="level_id"
          required
          defaultValue="developing"
          className={selectClassName}
        >
          {MASTERY_OVERRIDE_LEVEL_IDS.map((id) => (
            <option key={id} value={id}>
              {MASTERY_OVERRIDE_SCALE[id].label}
            </option>
          ))}
        </select>
        <FieldError errors={state.fieldErrors} name="level_id" />
      </div>

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-muted-foreground" role="status">
          Override recorded. Mastery updated via Evidence policy; Confidence
          unchanged by claim strength alone.
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Recording…" : "Record mastery override"}
      </Button>
    </form>
  );
}
