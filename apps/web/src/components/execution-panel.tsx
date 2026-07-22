import { completeTask } from "@/app/dashboard/actions";
import { SkipTaskForm } from "@/components/override-forms";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ExecutionPlanResult } from "@/lib/execution-engine/execution-engine-service";
import type { ExecutionPlan, TaskInstance } from "@/lib/execution-engine/types";
import { cn } from "@/lib/utils";

/**
 * Renders the deterministic execution hierarchy for the current recommendation:
 * Mission -> active Quest -> Today's Tasks. Interactions: complete or skip a
 * task; quest/mission progress is derived server-side.
 */
export function ExecutionPanel({ result }: { result: ExecutionPlanResult }) {
  if (result.status === "none") {
    return null;
  }

  if (result.status === "unsupported") {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Execution plan</CardTitle>
          <CardDescription>
            {result.skillName} doesn&apos;t have an execution template yet, so
            there are no tasks to generate for it. Templates are added
            deliberately — nothing is fabricated.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return <ExecutionPlanView plan={result.plan} />;
}

function ExecutionPlanView({ plan }: { plan: ExecutionPlan }) {
  const { mission, activeQuest, todaysTasks, questProgress, questPosition } =
    plan;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardDescription>Your mission</CardDescription>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-xl">{mission.title}</CardTitle>
          <StatusBadge label={plan.missionCompleted ? "Completed" : "Active"} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {mission.description}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {plan.missionCompleted || !activeQuest ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Every quest in this mission is complete. Nice work.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{activeQuest.title}</p>
                <span className="text-xs text-muted-foreground">
                  Quest {questPosition.index} of {questPosition.total}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeQuest.description}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {questProgress.completedTasks} of {questProgress.totalTasks}{" "}
                tasks complete
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Today&apos;s tasks</p>
              <ul className="space-y-2">
                {todaysTasks.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TaskRow({ task }: { task: TaskInstance }) {
  const isDone = task.status === "completed";
  const isSkipped = task.status === "skipped";
  const isResolved = isDone || isSkipped;

  return (
    <li className="rounded-lg border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cn(
              "text-sm font-medium",
              isResolved && "text-muted-foreground line-through",
            )}
          >
            {task.title}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {task.description}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            ~{task.estimatedMinutes} min
          </p>
        </div>

        {isDone ? (
          <span className="shrink-0 text-xs font-medium text-muted-foreground">
            Done
          </span>
        ) : isSkipped ? (
          <span className="shrink-0 text-xs font-medium text-muted-foreground">
            Skipped
          </span>
        ) : (
          <form action={completeTask} className="shrink-0">
            <input type="hidden" name="taskId" value={task.id} />
            <button
              type="submit"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Complete
            </button>
          </form>
        )}
      </div>
      {!isResolved ? <SkipTaskForm taskId={task.id} /> : null}
    </li>
  );
}

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
      {label}
    </span>
  );
}
