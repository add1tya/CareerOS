/**
 * Opportunity service (Sprint 16 / M16).
 *
 * Loads Constraints context (via Career Graph for deadline), History constraint
 * changes, and Planning remaining effort, then runs the pure assessor.
 * Writes NOTHING. Flat dependency graph — no Risk, Recovery, or Decision
 * (ADR-0013).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { getCareerGraph } from "@/lib/career-graph-service";
import {
  constraintChangeFromPayload,
  computeOpportunityAssessment,
} from "@/lib/opportunity/opportunity-assessor";
import {
  CONSTRAINT_CHANGE_EVENT,
  type ConstraintChange,
  type OpportunityAssessment,
} from "@/lib/opportunity/opportunity-types";
import { getRoadmap } from "@/lib/planning/planning-service";

export async function getOpportunityAssessment(
  supabase: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<OpportunityAssessment> {
  const [careerGraph, roadmap, constraintChanges] = await Promise.all([
    getCareerGraph(supabase, userId),
    getRoadmap(supabase, userId),
    loadConstraintChanges(supabase, userId),
  ]);

  return computeOpportunityAssessment({
    now,
    goalDeadline: careerGraph.rootGoal?.deadline ?? null,
    remainingHoursMin: roadmap.remainingHoursMin,
    remainingHoursMax: roadmap.remainingHoursMax,
    constraintChanges,
  });
}

async function loadConstraintChanges(
  supabase: SupabaseClient,
  userId: string,
): Promise<ConstraintChange[]> {
  const { data, error } = await supabase
    .from("history_events")
    .select("event_type, occurred_at, payload")
    .eq("user_id", userId)
    .eq("event_type", CONSTRAINT_CHANGE_EVENT);

  if (error) {
    throw new Error(
      `Failed to load history for opportunity: ${error.message}`,
    );
  }

  const changes: ConstraintChange[] = [];
  for (const row of data ?? []) {
    const payload = (row.payload ?? {}) as Record<
      string,
      string | number | boolean | null
    >;
    const change = constraintChangeFromPayload(
      row.occurred_at as string,
      payload,
    );
    if (change) changes.push(change);
  }
  return changes;
}
