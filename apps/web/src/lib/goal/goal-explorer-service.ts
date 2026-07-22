/**
 * Goal Explorer service (Sprint 22 / M22).
 *
 * Loads Goal + Constraints (+ optional Roadmap) and runs the pure explorer.
 * Writes nothing (ADR-0019).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { getCareerGraph } from "@/lib/career-graph-service";
import { buildGoalExplorerView } from "@/lib/goal/goal-explorer-view";
import type { GoalExplorerView } from "@/lib/goal/goal-explorer-types";
import { getRoadmap } from "@/lib/planning/planning-service";

export async function getGoalExplorerView(
  supabase: SupabaseClient,
  userId: string,
  options?: { includeRoadmap?: boolean },
): Promise<GoalExplorerView | null> {
  const includeRoadmap = options?.includeRoadmap ?? true;

  const careerGraph = await getCareerGraph(supabase, userId);
  const roadmap = includeRoadmap
    ? await getRoadmap(supabase, userId)
    : null;

  return buildGoalExplorerView({
    goal: careerGraph.rootGoal,
    constraint: careerGraph.constraint,
    roadmap,
  });
}
