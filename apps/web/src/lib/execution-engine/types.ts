/**
 * Execution Engine v1 types (Sprint 6).
 *
 * Two clearly separated families (ADR-0003):
 *  - TEMPLATE types (in ./templates) — reusable, versioned, immutable definitions.
 *  - INSTANCE types (here) — user-specific persisted rows generated from a
 *    template. Instances are never mutated by later template revisions.
 *
 * The engine is entirely deterministic: identical Recommendation + template
 * version -> identical Mission/Quest/Task instances. No Claude, no LLM.
 */

export type ExecutionStatus =
  | "proposed"
  | "active"
  | "completed"
  | "skipped"
  | "abandoned";

export type TaskStatus = "pending" | "active" | "completed" | "skipped";

/** A generated Mission instance (public.missions row). */
export type MissionInstance = {
  id: string;
  userId: string;
  generatedFromSkillKey: string;
  generatedFromRecommendationId: string | null;
  goalId: string | null;
  title: string;
  description: string;
  status: ExecutionStatus;
  source: string;
  templateKey: string;
  templateVersion: number;
  generatedAt: string;
  createdAt: string;
};

/** A generated Quest instance (public.quests row). */
export type QuestInstance = {
  id: string;
  missionId: string;
  title: string;
  description: string;
  status: ExecutionStatus;
  orderIndex: number;
  completedAt: string | null;
};

/** A generated Task instance (public.tasks row). */
export type TaskInstance = {
  id: string;
  questId: string;
  generatedFromSkillKey: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  orderIndex: number;
  status: TaskStatus;
  completedAt: string | null;
};

/**
 * Assembled execution plan the dashboard renders: the Mission, its currently
 * active Quest (if any), and that Quest's session tasks. When the Mission is
 * complete, activeQuest is null and missionCompleted is true.
 */
export type ExecutionPlan = {
  mission: MissionInstance;
  activeQuest: QuestInstance | null;
  todaysTasks: TaskInstance[];
  /** Task progress within the active quest. */
  questProgress: { completedTasks: number; totalTasks: number };
  /** Which quest (1-based) of the template's total this is. */
  questPosition: { index: number; total: number };
  missionCompleted: boolean;
};
