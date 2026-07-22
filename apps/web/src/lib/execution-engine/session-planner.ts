/**
 * Session Planner (Sprint 6).
 *
 * Pure, deterministic selection of "Today's Tasks" from the active Quest's
 * tasks. V1 rule: show the quest's tasks in order, incomplete ones first,
 * capped so a session stays focused. No scheduling, no adaptivity, no AI —
 * identical input always yields identical output.
 */
import type { TaskInstance } from "./types";

/** Maximum tasks surfaced for a single session (scope: 3–5 executable tasks). */
export const SESSION_TASK_CAP = 5;

/**
 * Returns the tasks to work on now: the active quest's tasks in order, with any
 * still-pending/active tasks ahead of resolved ones, capped at SESSION_TASK_CAP.
 * Completed/skipped tasks are retained (within the cap) so progress stays visible.
 */
export function planSession(tasks: TaskInstance[]): TaskInstance[] {
  const byOrder = [...tasks].sort((a, b) => a.orderIndex - b.orderIndex);

  const incomplete = byOrder.filter(
    (task) => task.status !== "completed" && task.status !== "skipped",
  );
  const resolved = byOrder.filter(
    (task) => task.status === "completed" || task.status === "skipped",
  );

  return [...incomplete, ...resolved].slice(0, SESSION_TASK_CAP);
}
