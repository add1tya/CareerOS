/**
 * Goal progress service (Sprint 19 / M19).
 *
 * Loads Goal + computed Roadmap and runs the pure explainer. Writes nothing.
 * Does not recompute ranking or mastery (ADR-0016).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { getCareerGraph } from "@/lib/career-graph-service";
import { getRoadmap } from "@/lib/planning/planning-service";
import { explainGoalProgress } from "@/lib/progress/goal-progress-explanation";
import type { GoalProgressExplanation } from "@/lib/progress/goal-progress-explainability-types";

export async function getGoalProgressExplanation(
  supabase: SupabaseClient,
  userId: string,
): Promise<GoalProgressExplanation> {
  const [careerGraph, roadmap] = await Promise.all([
    getCareerGraph(supabase, userId),
    getRoadmap(supabase, userId),
  ]);

  const goal = careerGraph.rootGoal;
  return explainGoalProgress({
    goalTitle: goal?.title ?? null,
    goalDeadline: goal?.deadline ?? null,
    goalStatus: goal?.status ?? null,
    roadmap,
  });
}
