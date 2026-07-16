"use client";

import { useActionState, useState } from "react";

import {
  submitOnboarding,
  type OnboardingActionState,
} from "@/app/onboarding/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TARGET_ROLE_OPTIONS } from "@/lib/onboarding-schema";

const initialState: OnboardingActionState = {};

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

export function OnboardingForm() {
  const [state, formAction, isPending] = useActionState(
    submitOnboarding,
    initialState,
  );
  const [roleOption, setRoleOption] = useState<string>("AI Engineer");

  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardHeader>
        <CardTitle>Welcome to CareerOS</CardTitle>
        <CardDescription>
          Tell us where you are and where you want to go. We will use this later
          to build your Career Graph — for now we only save your answers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="display_name">Name</Label>
            <Input
              id="display_name"
              name="display_name"
              required
              autoComplete="name"
              placeholder="Your name"
            />
            <FieldError errors={state.fieldErrors} name="display_name" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="current_profession">Current profession</Label>
            <Input
              id="current_profession"
              name="current_profession"
              required
              placeholder="e.g. Mechanical Engineer"
            />
            <FieldError errors={state.fieldErrors} name="current_profession" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_role_option">Target role</Label>
            <select
              id="target_role_option"
              name="target_role_option"
              required
              value={roleOption}
              onChange={(event) => setRoleOption(event.target.value)}
              className="border-input bg-background h-9 w-full rounded-lg border px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {TARGET_ROLE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <FieldError errors={state.fieldErrors} name="target_role_option" />
          </div>

          {roleOption === "Custom" ? (
            <div className="space-y-2">
              <Label htmlFor="target_role_custom">Custom target role</Label>
              <Input
                id="target_role_custom"
                name="target_role_custom"
                required
                placeholder="Describe your target role"
              />
              <FieldError
                errors={state.fieldErrors}
                name="target_role_custom"
              />
            </div>
          ) : (
            <input type="hidden" name="target_role_custom" value="" />
          )}

          <div className="space-y-2">
            <Label htmlFor="timeline_months">Timeline (months)</Label>
            <Input
              id="timeline_months"
              name="timeline_months"
              type="number"
              required
              min={1}
              max={120}
              defaultValue={12}
            />
            <FieldError errors={state.fieldErrors} name="timeline_months" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="available_hours_per_week">
              Available hours per week
            </Label>
            <Input
              id="available_hours_per_week"
              name="available_hours_per_week"
              type="number"
              required
              min={1}
              max={80}
              defaultValue={10}
            />
            <FieldError
              errors={state.fieldErrors}
              name="available_hours_per_week"
            />
          </div>

          {state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Saving…" : "Continue to dashboard"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
