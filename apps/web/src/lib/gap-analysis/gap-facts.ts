/**
 * Gap Facts builder (ADR-0025).
 *
 * Career Graph / Roadmap / Evidence reads → citeable atoms. No LLM.
 * Missing (no verified evidence) and Weak (evidence present, low mastery)
 * are separate kinds — never merged.
 */

import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getCareerGraph } from "@/lib/career-graph-service";
import { getGoalProgressExplanation } from "@/lib/progress/goal-progress-service";
import { getRoadmap } from "@/lib/planning/planning-service";
import { getProfile } from "@/lib/profile-service";
import { getSkillGraph } from "@/lib/skill-graph/skill-graph-service";
import type { SkillGraphNode } from "@/lib/skill-graph/types";
import type {
  GapFactAtom,
  GapFacts,
} from "@/lib/gap-analysis/gap-analysis-types";

/** Mastery below this with evidence present → weak (not missing). */
const WEAK_MASTERY_CEILING = 0.55;

/** Strengths: verified/mastered, or mastery at/above this. */
const STRENGTH_MASTERY_FLOOR = 0.7;

const MAX_STRENGTH = 16;
const MAX_MISSING = 16;
const MAX_WEAK = 16;
const MAX_ROADMAP = 24;

export async function buildGapFacts(
  supabase: SupabaseClient,
  userId: string,
): Promise<GapFacts> {
  const profile = await getProfile(supabase, userId);
  if (!profile) {
    return {
      sufficient: false,
      insufficientReason:
        "Complete onboarding before generating a gap analysis.",
      atoms: [],
      assembledAt: new Date().toISOString(),
      goal: { title: null, status: null, deadline: null },
    };
  }

  const [careerGraph, skillGraph, roadmap, progress, evidenceBySkill, latestRec] =
    await Promise.all([
      getCareerGraph(supabase, userId),
      getSkillGraph(supabase, userId),
      getRoadmap(supabase, userId),
      getGoalProgressExplanation(supabase, userId),
      loadEvidencePresence(supabase, userId),
      loadLatestRecommendation(supabase, userId),
    ]);

  const goal = careerGraph.rootGoal;
  const goalMeta = {
    title: goal?.title ?? null,
    status: goal?.status ?? null,
    deadline: goal?.deadline ?? null,
  };

  const atoms: GapFactAtom[] = [];
  const push = (
    id: string,
    kind: GapFactAtom["kind"],
    label: string,
    value: string,
  ) => {
    atoms.push({ id, kind, label, value });
  };

  if (goal) {
    push("goal.title", "goal", "Active goal", goal.title);
    push("goal.status", "goal", "Goal status", goal.status);
    if (goal.deadline) {
      push("goal.deadline", "goal", "Goal deadline", goal.deadline);
    }
  } else {
    push("goal.absent", "goal", "Active goal", "No active goal on record");
  }

  push(
    "progress.stage",
    "progress",
    "Roadmap stage",
    progress.currentStage,
  );

  const unlocked = skillGraph.nodes.filter((n) => n.status !== "locked");

  // Strengths
  const strengths = unlocked
    .filter(isStrength)
    .sort((a, b) => b.mastery - a.mastery || a.display_order - b.display_order)
    .slice(0, MAX_STRENGTH);
  for (const node of strengths) {
    push(
      `strength.${node.skill_key}`,
      "strength",
      node.name,
      `status=${node.status}; mastery=${node.mastery.toFixed(2)}; confidence=${node.confidence.toFixed(2)}`,
    );
  }
  if (strengths.length === 0) {
    push(
      "strengths.absent",
      "strength",
      "Strengths",
      "No verified high-mastery strengths on record",
    );
  }

  // Missing vs Weak — never merge (ADR-0025).
  // Missing: unlocked skill with no evidence rows (no verified evidence).
  // Weak: at least one evidence row AND mastery still low.
  const missingCandidates: SkillGraphNode[] = [];
  const weakCandidates: SkillGraphNode[] = [];
  for (const node of unlocked) {
    if (isStrength(node)) continue;
    const hasEvidence = (evidenceBySkill.get(node.skill_key) ?? 0) > 0;
    if (!hasEvidence) {
      missingCandidates.push(node);
    } else if (node.mastery < WEAK_MASTERY_CEILING) {
      weakCandidates.push(node);
    }
  }

  missingCandidates
    .sort((a, b) => a.display_order - b.display_order)
    .slice(0, MAX_MISSING)
    .forEach((node) => {
      push(
        `missing.${node.skill_key}`,
        "missing",
        node.name,
        `status=${node.status}; mastery=${node.mastery.toFixed(2)}; evidence_count=0`,
      );
    });
  if (missingCandidates.length === 0) {
    push(
      "missing.absent",
      "missing",
      "Missing evidence",
      "No unlocked skills without Evidence on record",
    );
  }

  weakCandidates
    .sort((a, b) => a.mastery - b.mastery || a.display_order - b.display_order)
    .slice(0, MAX_WEAK)
    .forEach((node) => {
      const count = evidenceBySkill.get(node.skill_key) ?? 0;
      push(
        `weak.${node.skill_key}`,
        "weak",
        node.name,
        `status=${node.status}; mastery=${node.mastery.toFixed(2)}; evidence_count=${count}; note=evidence_present_low_mastery`,
      );
    });
  if (weakCandidates.length === 0) {
    push(
      "weak.absent",
      "weak",
      "Weak mastery",
      "No unlocked skills with Evidence and low mastery on record",
    );
  }

  // Roadmap path facts (current state only — not forecasts).
  const pathSteps = roadmap.steps.slice(0, MAX_ROADMAP);
  for (const step of pathSteps) {
    push(
      `roadmap.${step.skillKey}`,
      "roadmap",
      step.name,
      `kind=${step.kind}; status=${step.status}; mastery=${step.mastery.toFixed(2)}; confidence=${step.confidence.toFixed(2)}`,
    );
    for (const block of step.blockedBy) {
      push(
        `block.${step.skillKey}.${block.skillKey}`,
        "block",
        `${step.name} blocked by ${block.name}`,
        `required_mastery=${block.minimumMastery}; current_mastery=${block.currentMastery}`,
      );
    }
  }
  if (pathSteps.length === 0) {
    push(
      "roadmap.empty",
      "roadmap",
      "Roadmap",
      "Computed roadmap has no steps",
    );
  }

  // Confidence gaps: mastery high-ish, confidence materially lower.
  let confidenceCount = 0;
  for (const node of unlocked) {
    if (confidenceCount >= 12) break;
    if (node.mastery >= 0.5 && node.confidence < node.mastery - 0.2) {
      push(
        `confidence.${node.skill_key}`,
        "confidence",
        node.name,
        `mastery=${node.mastery.toFixed(2)}; confidence=${node.confidence.toFixed(2)}`,
      );
      confidenceCount += 1;
    }
  }
  if (confidenceCount === 0) {
    push(
      "confidence.absent",
      "confidence",
      "Confidence gaps",
      "No mastery/confidence mismatch atoms on record",
    );
  }

  if (latestRec) {
    const recName =
      skillGraph.nodes.find((n) => n.skill_key === latestRec.skill_key)?.name ??
      latestRec.skill_key;
    push(
      "focus.recommendation",
      "focus",
      "Current Decision Engine focus",
      `${recName} (${latestRec.skill_key}); descriptive only — not planning advice`,
    );
  } else {
    push(
      "focus.unavailable",
      "focus",
      "Current focus",
      "No recommendation on record",
    );
  }

  push(
    "limits.not_progress_score",
    "limits",
    "Measurement limits",
    "This report is not a Progress Score or weighted goal completion percentage.",
  );
  push(
    "limits.not_planning",
    "limits",
    "Planning ownership",
    "This report does not recommend alternate roadmaps, reprioritize skills, generate learning plans, or estimate completion.",
  );
  push(
    "limits.present_tense",
    "limits",
    "Present tense",
    "Narratives describe current CareerOS state only — no predictions or future guarantees.",
  );

  const hasIdentity = Boolean(goal?.title?.trim()) || Boolean(profile.display_name?.trim());
  const hasSignal =
    unlocked.length > 0 || pathSteps.length > 0 || strengths.length > 0;
  const sufficient = hasIdentity && hasSignal;

  return {
    sufficient,
    insufficientReason: sufficient
      ? null
      : "Need a goal/profile and at least one skill or roadmap signal before analysis.",
    atoms,
    assembledAt: new Date().toISOString(),
    goal: goalMeta,
  };
}

export function hashGapFacts(facts: GapFacts): string {
  return createHash("sha256").update(JSON.stringify(facts)).digest("hex");
}

function isStrength(node: SkillGraphNode): boolean {
  if (node.status === "verified" || node.status === "mastered") return true;
  return node.mastery >= STRENGTH_MASTERY_FLOOR;
}

async function loadEvidencePresence(
  supabase: SupabaseClient,
  userId: string,
): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from("skill_evidence")
    .select("skill_key")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to load evidence for gap facts: ${error.message}`);
  }

  const map = new Map<string, number>();
  for (const row of data ?? []) {
    const key = row.skill_key as string;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

async function loadLatestRecommendation(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ skill_key: string } | null> {
  const { data, error } = await supabase
    .from("skill_recommendations")
    .select("recommended_skill_key")
    .eq("user_id", userId)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to load recommendation for gap facts: ${error.message}`,
    );
  }
  if (!data) return null;
  return { skill_key: data.recommended_skill_key as string };
}
