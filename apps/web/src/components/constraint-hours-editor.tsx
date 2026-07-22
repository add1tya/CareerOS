"use client";

import { useActionState } from "react";

import {
  updateAvailableHoursAction,
  type ConstraintHoursFormState,
} from "@/app/dashboard/constraint-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const initialState: ConstraintHoursFormState = {};

const inputClassName =
  "border-input bg-background h-9 w-full max-w-[8rem] rounded-lg border px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * Minimal hours editor — creates Constraint Change facts for Opportunity.
 * Not a full constraint manager.
 */
export function ConstraintHoursEditor({
  currentHours,
}: {
  currentHours: number;
}) {
  const [state, formAction, isPending] = useActionState(
    updateAvailableHoursAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-3 space-y-2">
      <Label htmlFor="available_hours_per_week" className="text-xs">
        Update weekly hours
      </Label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id="available_hours_per_week"
          name="available_hours_per_week"
          type="number"
          min={1}
          max={80}
          step={1}
          required
          defaultValue={currentHours}
          className={inputClassName}
        />
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Saving…" : "Save"}
        </Button>
      </div>
      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-xs text-muted-foreground" role="status">
          Hours updated.
        </p>
      ) : null}
    </form>
  );
}
