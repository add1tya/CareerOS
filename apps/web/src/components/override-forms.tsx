"use client";

import { useActionState, useState } from "react";

import {
  overrideRecommendationAction,
  skipTaskAction,
  type OverrideFormState,
} from "@/app/dashboard/override-actions";
import { buttonVariants } from "@/components/ui/button";
import {
  OVERRIDE_REASON_CODES,
  OVERRIDE_REASON_LABELS,
  type OverrideReasonCode,
} from "@/lib/override/override-types";
import { cn } from "@/lib/utils";

const initialState: OverrideFormState = {};

function ReasonFields({
  defaultCode = "not_relevant_now",
}: {
  defaultCode?: OverrideReasonCode;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-muted-foreground">
        Reason
        <select
          name="reason_code"
          defaultValue={defaultCode}
          className="mt-1 block w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          required
        >
          {OVERRIDE_REASON_CODES.map((code) => (
            <option key={code} value={code}>
              {OVERRIDE_REASON_LABELS[code]}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium text-muted-foreground">
        Optional note
        <input
          type="text"
          name="reason_text"
          maxLength={500}
          placeholder="Optional context (not interpreted by the system)"
          className="mt-1 block w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
        />
      </label>
    </div>
  );
}

export function OverrideRecommendationForm({
  recommendationId,
}: {
  recommendationId: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    overrideRecommendationAction,
    initialState,
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
      >
        Not this skill
      </button>
    );
  }

  return (
    <form action={action} className="space-y-3 rounded-lg border border-dashed p-3">
      <input type="hidden" name="recommendation_id" value={recommendationId} />
      <p className="text-xs text-muted-foreground">
        Overrides are signal, not errors — we&apos;ll recommend a different skill
        and leave your existing Mission history unchanged.
      </p>
      <ReasonFields />
      {state.error ? (
        <p className="text-xs text-destructive">{state.error}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          {pending ? "Saving…" : "Confirm override"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function SkipTaskForm({ taskId }: { taskId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(skipTaskAction, initialState);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
      >
        Skip
      </button>
    );
  }

  return (
    <form action={action} className="mt-2 space-y-2 rounded-lg border border-dashed p-2">
      <input type="hidden" name="task_id" value={taskId} />
      <ReasonFields defaultCode="need_break" />
      {state.error ? (
        <p className="text-xs text-destructive">{state.error}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          {pending ? "Skipping…" : "Confirm skip"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
