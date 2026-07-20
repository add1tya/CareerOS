/**
 * Planning Engine service (Sprint 9 / M9).
 *
 * Thin, READ-ONLY shell around the pure `computeRoadmap`: it reads stored facts
 * (Skill Graph overlay + Goal) and returns the computed Roadmap. It writes
 * NOTHING — the Roadmap is computed, never persisted (AR-01,
 * career-graph-schema.md §7.2: the Planning Engine "writes nothing back to a
 * 'Roadmap' table, since none exists"). Materialization of active work remains
 * the Execution Engine's job, and only for the current skill.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { getCareerGraph } from "@/lib/career-graph-service";
import { computeRoadmap } from "@/lib/planning/roadmap-computer";
import type { Roadmap } from "@/lib/planning/roadmap-types";
import { getSkillGraph } from "@/lib/skill-graph/skill-graph-service";

/**
 * Computes the user's current Roadmap. Deterministic given the stored Skill
 * Graph state (AR-08): identical state -> identical Roadmap. Recomputed on every
 * call; nothing is cached or stored.
 */
export async function getRoadmap(
  supabase: SupabaseClient,
  userId: string,
): Promise<Roadmap> {
  const [skillGraph, careerGraph] = await Promise.all([
    getSkillGraph(supabase, userId),
    getCareerGraph(supabase, userId),
  ]);

  return computeRoadmap(skillGraph, careerGraph.rootGoal?.title ?? null);
}
