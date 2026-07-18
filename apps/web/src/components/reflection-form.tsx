"use client";

import { useActionState } from "react";

import {
  createReflectionAction,
  type ReflectionFormState,
} from "@/app/reflect/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  REFLECTION_PROMPT,
  SELF_ASSESSMENT_LEVELS,
  SELF_ASSESSMENT_SCALE,
} from "@/lib/reflection/reflection-types";

const initialState: ReflectionFormState = {};

const selectClassName =
  "border-input bg-background h-9 w-full rounded-lg border px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

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

export type ReflectableSkill = { skillKey: string; name: string };

export function ReflectionForm({ skills }: { skills: ReflectableSkill[] }) {
  const [state, formAction, isPending] = useActionState(
    createReflectionAction,
    initialState,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reflect on a skill</CardTitle>
        <CardDescription>
          Record how a skill feels after recent work. Your reflection proposes an
          update — it only changes your Skill Graph after you confirm it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {skills.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No unlocked skills to reflect on yet. Start working on your
            recommended skill first.
          </p>
        ) : (
          <form action={formAction} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="skill_key">Skill</Label>
              <select
                id="skill_key"
                name="skill_key"
                required
                defaultValue={skills[0]?.skillKey}
                className={selectClassName}
              >
                {skills.map((skill) => (
                  <option key={skill.skillKey} value={skill.skillKey}>
                    {skill.name}
                  </option>
                ))}
              </select>
              <FieldError errors={state.fieldErrors} name="skill_key" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="self_assessment">{REFLECTION_PROMPT}</Label>
              <select
                id="self_assessment"
                name="self_assessment"
                required
                defaultValue="comfortable"
                className={selectClassName}
              >
                {SELF_ASSESSMENT_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {SELF_ASSESSMENT_SCALE[level].label}
                  </option>
                ))}
              </select>
              <FieldError errors={state.fieldErrors} name="self_assessment" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="response_text">Notes (optional)</Label>
              <textarea
                id="response_text"
                name="response_text"
                rows={3}
                maxLength={2000}
                placeholder="What went well, what felt hard? (context only — does not change mastery)"
                className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <FieldError errors={state.fieldErrors} name="response_text" />
            </div>

            {state.error ? (
              <p className="text-sm text-destructive" role="alert">
                {state.error}
              </p>
            ) : null}

            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Create reflection"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
