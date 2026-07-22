/**
 * Risk service (Sprint 14 / M14).
 *
 * Loads Goals, Constraints, History, and Planning remaining effort, then runs
 * the pure assessor. Writes NOTHING. Does not call Recovery (flat dependency
 * graph — both project from History independently) (ADR-0011).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { getCareerGraph } from "@/lib/career-graph-service";
import type { HistoryEventType } from "@/lib/history/history-types";
import { getRoadmap } from "@/lib/planning/planning-service";
import { computeRiskAssessment } from "@/lib/risk/risk-assessor";
import type {
  RiskAssessment,
  RiskHistoryFact,
} from "@/lib/risk/risk-types";

export async function getRiskAssessment(
  supabase: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<RiskAssessment> {
  const [careerGraph, roadmap, history] = await Promise.all([
    getCareerGraph(supabase, userId),
    getRoadmap(supabase, userId),
    loadHistoryFacts(supabase, userId),
  ]);

  return computeRiskAssessment({
    now,
    goalDeadline: careerGraph.rootGoal?.deadline ?? null,
    availableHoursPerWeek:
      careerGraph.constraint?.available_hours_per_week ?? null,
    remainingHoursMin: roadmap.remainingHoursMin,
    remainingHoursMax: roadmap.remainingHoursMax,
    history,
  });
}

async function loadHistoryFacts(
  supabase: SupabaseClient,
  userId: string,
): Promise<RiskHistoryFact[]> {
  const { data, error } = await supabase
    .from("history_events")
    .select("event_type, occurred_at")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to load history for risk: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    eventType: row.event_type as HistoryEventType,
    occurredAt: row.occurred_at as string,
  }));
}
