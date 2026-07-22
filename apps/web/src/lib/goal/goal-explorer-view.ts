/**
 * Pure Goal Explorer builder (Sprint 22 / M22).
 *
 * Pipeline: Goal → Goal Facts → Goal Context → Goal Path Facts → View.
 * No I/O. Does not infer requirements or call Planning (ADR-0019).
 * Roadmap is optional enrichment only.
 */
import type { ConstraintRow, Goal } from "@/lib/career-graph-service";
import {
  GOAL_EXPLORER_VERSION,
  type GoalConstraintContext,
  type GoalContext,
  type GoalExplorerView,
  type GoalFacts,
  type GoalPathFacts,
  type GoalPathSkillFact,
} from "@/lib/goal/goal-explorer-types";
import type { Roadmap, RoadmapStep } from "@/lib/planning/roadmap-types";

export type BuildGoalExplorerInput = {
  goal: Goal | null;
  constraint: ConstraintRow | null;
  /** Optional — explorer must work when omitted. */
  roadmap?: Roadmap | null;
};

/**
 * Full projection. Returns null when there is no goal to inspect.
 */
export function buildGoalExplorerView(
  input: BuildGoalExplorerInput,
): GoalExplorerView | null {
  if (!input.goal) return null;

  const goalFacts = goalFactsFrom(input.goal);
  const context = goalContextFrom(goalFacts, input.constraint);
  const pathFacts = input.roadmap
    ? goalPathFactsFrom(input.roadmap)
    : null;

  return goalExplorerViewFrom(context, pathFacts);
}

export function goalFactsFrom(goal: Goal): GoalFacts {
  return {
    goalId: goal.id,
    title: goal.title,
    source: goal.source,
    createdAt: goal.created_at,
    status: goal.status,
    deadline: goal.deadline,
    updatedAt: goal.updated_at,
    parentGoalId: goal.parent_goal_id,
  };
}

export function goalContextFrom(
  goal: GoalFacts,
  constraint: ConstraintRow | null,
): GoalContext {
  const constraints: GoalConstraintContext = {
    availableHoursPerWeek: constraint?.available_hours_per_week ?? null,
    lastConfirmedAt: constraint?.last_confirmed_at ?? null,
    constraintCreatedAt: constraint?.created_at ?? null,
    constraintUpdatedAt: constraint?.updated_at ?? null,
  };
  return { goal, constraints };
}

export function goalPathFactsFrom(roadmap: Roadmap): GoalPathFacts {
  const completed = roadmap.steps.filter((s) => s.kind === "completed");
  const current = roadmap.steps.find((s) => s.kind === "current") ?? null;
  const upcoming = roadmap.steps.filter((s) => s.kind === "upcoming");
  const remaining = [...(current ? [current] : []), ...upcoming];

  return {
    planningEngineVersion: roadmap.planningEngineVersion,
    completedOnPath: completed.map(toPathSkill),
    currentOnPath: current ? toPathSkill(current) : null,
    remainingOnPath: remaining.map(toPathSkill),
    remainingHoursMin: roadmap.remainingHoursMin,
    remainingHoursMax: roadmap.remainingHoursMax,
  };
}

export function goalExplorerViewFrom(
  context: GoalContext,
  pathFacts: GoalPathFacts | null,
): GoalExplorerView {
  const g = context.goal;

  return {
    goalExplorerVersion: GOAL_EXPLORER_VERSION,
    goalId: g.goalId,
    title: g.title,
    source: g.source,
    createdAt: g.createdAt,
    status: g.status,
    metadataSection: metadataCopy(g),
    constraintsSection: constraintsCopy(context.constraints),
    currentRoadmapCompletedSection: pathFacts
      ? pathListCopy(
          "Current Roadmap — completed skills on path",
          pathFacts.completedOnPath,
        )
      : "Current Roadmap context not provided — skill path lists omitted.",
    currentRoadmapCurrentSection: pathFacts
      ? currentCopy(pathFacts.currentOnPath)
      : "Current Roadmap context not provided.",
    currentRoadmapRemainingSection: pathFacts
      ? pathListCopy(
          "Current Roadmap — remaining skills on path (current + upcoming)",
          pathFacts.remainingOnPath,
        )
      : "Current Roadmap context not provided.",
    currentRoadmapContributionSection: pathFacts
      ? contributionCopy(pathFacts)
      : "Current Roadmap context not provided — no path contribution figures.",
    measurementLimits: MEASUREMENT_LIMITS,
    completedOnPath: pathFacts?.completedOnPath ?? [],
    currentOnPath: pathFacts?.currentOnPath ?? null,
    remainingOnPath: pathFacts?.remainingOnPath ?? [],
    hasRoadmapContext: pathFacts !== null,
  };
}

const MEASUREMENT_LIMITS =
  "Skills listed under Current Roadmap are path associations from Planning, not ontology goal requirements. Canonical required-skill weights require skill_goal_relevance (deferred). This explorer does not estimate Progress Score, overall goal readiness, or % completion. Hours on the Current Roadmap are informational context only.";

function toPathSkill(step: RoadmapStep): GoalPathSkillFact {
  return {
    skillKey: step.skillKey,
    name: step.name,
    kind: step.kind,
    mastery: step.mastery,
    confidence: step.confidence,
    status: step.status,
  };
}

function metadataCopy(g: GoalFacts): string {
  const deadline = g.deadline ? g.deadline : "none";
  const parent = g.parentGoalId ?? "none (root)";
  return `Goal id ${g.goalId}; title "${g.title}"; status ${g.status}; source ${g.source}; created ${g.createdAt}; updated ${g.updatedAt}; deadline ${deadline}; parent_goal_id ${parent}.`;
}

function constraintsCopy(c: GoalConstraintContext): string {
  if (c.availableHoursPerWeek === null) {
    return "No constraints row on record. Deferred Constraint Model fields (weekday/weekend splits, seasonal variance, competing obligations) are not stored in V1.";
  }
  const confirmed = c.lastConfirmedAt ?? "never";
  return `Recorded available hours: ${c.availableHoursPerWeek}/week; last confirmed ${confirmed}. Constraint row created ${c.constraintCreatedAt ?? "—"}; updated ${c.constraintUpdatedAt ?? "—"}. These bound how the goal is pursued; they are not goal metadata. Deferred Constraint Model fields remain unimplemented.`;
}

function pathListCopy(title: string, skills: GoalPathSkillFact[]): string {
  if (skills.length === 0) return `${title}: none.`;
  const list = skills
    .map(
      (s) =>
        `${s.name} (${s.skillKey}, ${s.kind}; mastery ${s.mastery.toFixed(2)}, confidence ${s.confidence.toFixed(2)})`,
    )
    .join("; ");
  return `${title} (${skills.length}, unranked): ${list}.`;
}

function currentCopy(current: GoalPathSkillFact | null): string {
  if (!current) {
    return "Current Roadmap — no current skill on path.";
  }
  return `Current Roadmap — current skill: ${current.name} (${current.skillKey}; status ${current.status}; mastery ${current.mastery.toFixed(2)}, confidence ${current.confidence.toFixed(2)}).`;
}

function contributionCopy(path: GoalPathFacts): string {
  return `Current Roadmap contribution context: ${path.completedOnPath.length} completed on path; ${path.remainingOnPath.length} remaining on path; remaining effort ${path.remainingHoursMin}–${path.remainingHoursMax} hours (presentation only, Planning Engine v${path.planningEngineVersion}). Not a % of goal completion.`;
}
