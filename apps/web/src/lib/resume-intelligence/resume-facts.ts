/**
 * Resume Facts builder (ADR-0024).
 *
 * Career Graph reads → citeable atoms. No LLM. No domain writes.
 */

import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getCareerGraph } from "@/lib/career-graph-service";
import { getProfile } from "@/lib/profile-service";
import { getGoalProgressExplanation } from "@/lib/progress/goal-progress-service";
import { getSkillGraph } from "@/lib/skill-graph/skill-graph-service";
import type {
  ResumeFactAtom,
  ResumeFacts,
} from "@/lib/resume-intelligence/resume-intelligence-types";

/** Evidence types that may appear as accomplishment / experience atoms. */
const EXPERIENCE_EVIDENCE_TYPES = new Set([
  "completed_project",
  "course_completion",
  "github_activity",
  "portfolio",
  "code_review",
  "boss_battle",
  "interview",
  "external_validation",
]);

const MAX_SKILL_ATOMS = 24;
const MAX_EVIDENCE_ATOMS = 12;

export async function buildResumeFacts(
  supabase: SupabaseClient,
  userId: string,
): Promise<ResumeFacts> {
  const profile = await getProfile(supabase, userId);
  if (!profile) {
    return {
      sufficient: false,
      insufficientReason: "Complete onboarding before composing a resume draft.",
      atoms: [],
      assembledAt: new Date().toISOString(),
    };
  }

  const [careerGraph, skillGraph, progress, evidenceRows, latestRec] =
    await Promise.all([
      getCareerGraph(supabase, userId),
      getSkillGraph(supabase, userId),
      getGoalProgressExplanation(supabase, userId),
      loadRecentEvidence(supabase, userId),
      loadLatestRecommendation(supabase, userId),
    ]);

  const atoms: ResumeFactAtom[] = [];
  const push = (id: string, kind: string, label: string, value: string) => {
    atoms.push({ id, kind, label, value });
  };

  push(
    "profile.display_name",
    "profile",
    "Display name",
    profile.display_name,
  );
  push(
    "profile.current_profession",
    "profile",
    "Current profession",
    profile.current_profession,
  );
  push(
    "profile.target_role",
    "profile",
    "Target role",
    profile.target_role,
  );
  if (profile.timeline_months) {
    push(
      "profile.timeline_months",
      "profile",
      "Timeline (months)",
      String(profile.timeline_months),
    );
  }

  const goal = careerGraph.rootGoal;
  if (goal) {
    push("goal.title", "goal", "Active goal", goal.title);
    if (goal.deadline) {
      push("goal.deadline", "goal", "Goal deadline", goal.deadline);
    }
    push("goal.status", "goal", "Goal status", goal.status);
  } else {
    push("goal.absent", "goal", "Active goal", "No active goal on record");
  }

  if (progress.currentStage) {
    push(
      "progress.stage",
      "progress",
      "Roadmap stage",
      progress.currentStage,
    );
  }

  const skillNodes = skillGraph.nodes
    .filter((n) => n.status !== "locked")
    .sort((a, b) => b.mastery - a.mastery || a.display_order - b.display_order)
    .slice(0, MAX_SKILL_ATOMS);

  for (const node of skillNodes) {
    push(
      `skill.${node.skill_key}`,
      "skill",
      node.name,
      `status=${node.status}; mastery=${node.mastery.toFixed(2)}; confidence=${node.confidence.toFixed(2)}`,
    );
  }

  if (skillNodes.length === 0) {
    push(
      "skills.absent",
      "skill",
      "Skills",
      "No unlocked skills with overlay data",
    );
  }

  let experienceCount = 0;
  for (const ev of evidenceRows) {
    if (!EXPERIENCE_EVIDENCE_TYPES.has(ev.type)) continue;
    if (experienceCount >= MAX_EVIDENCE_ATOMS) break;
    const skillName =
      skillGraph.nodes.find((n) => n.skill_key === ev.skill_key)?.name ??
      ev.skill_key;
    push(
      `evidence.${ev.id}`,
      "evidence",
      `${ev.type} · ${skillName}`,
      `recorded_at=${ev.recorded_at}; implied_mastery=${ev.implied_mastery}; content_ref=${ev.content_ref ?? "none"}`,
    );
    experienceCount += 1;
  }

  if (experienceCount === 0) {
    push(
      "experience.unavailable",
      "evidence",
      "Verified experience",
      "No verified project/course/portfolio Evidence on record",
    );
  }

  // Education: V1 has no dedicated education table — honest absence atom.
  push(
    "education.unavailable",
    "education",
    "Education",
    "No verified education records in CareerOS",
  );

  if (latestRec) {
    const recName =
      skillGraph.nodes.find((n) => n.skill_key === latestRec.skill_key)?.name ??
      latestRec.skill_key;
    push(
      "focus.recommendation",
      "focus",
      "Current focus (Decision Engine)",
      `${recName} (${latestRec.skill_key}); not an employer or job title`,
    );
  } else {
    push(
      "focus.unavailable",
      "focus",
      "Current focus",
      "No recommendation on record",
    );
  }

  const hasIdentity =
    Boolean(profile.display_name?.trim()) || Boolean(goal?.title?.trim());
  const hasSkillSignal = skillNodes.some((n) => n.mastery > 0 || n.status !== "available");
  const hasEvidence = experienceCount > 0;
  const sufficient = hasIdentity && (hasSkillSignal || hasEvidence || skillNodes.length > 0);

  return {
    sufficient,
    insufficientReason: sufficient
      ? null
      : "Need a profile/goal and at least one unlocked skill (or Evidence) before composing.",
    atoms,
    assembledAt: new Date().toISOString(),
  };
}

export function hashResumeFacts(facts: ResumeFacts): string {
  return createHash("sha256").update(JSON.stringify(facts)).digest("hex");
}

async function loadRecentEvidence(
  supabase: SupabaseClient,
  userId: string,
): Promise<
  Array<{
    id: string;
    skill_key: string;
    type: string;
    implied_mastery: number;
    content_ref: string | null;
    recorded_at: string;
  }>
> {
  const { data, error } = await supabase
    .from("skill_evidence")
    .select("id, skill_key, type, implied_mastery, content_ref, recorded_at")
    .eq("user_id", userId)
    .order("recorded_at", { ascending: false })
    .limit(40);

  if (error) {
    throw new Error(`Failed to load evidence for resume facts: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    skill_key: row.skill_key as string,
    type: row.type as string,
    implied_mastery: Number(row.implied_mastery),
    content_ref: (row.content_ref as string | null) ?? null,
    recorded_at: row.recorded_at as string,
  }));
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
      `Failed to load recommendation for resume facts: ${error.message}`,
    );
  }
  if (!data) return null;
  return { skill_key: data.recommended_skill_key as string };
}
