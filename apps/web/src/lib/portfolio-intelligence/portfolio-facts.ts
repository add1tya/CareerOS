/**
 * Portfolio Facts builder (ADR-0028).
 *
 * Career Graph / Evidence reads → citeable atoms. No LLM.
 * Featured project order and learning journey chronology are fixed here.
 */

import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getCareerGraph } from "@/lib/career-graph-service";
import { getGoalProgressExplanation } from "@/lib/progress/goal-progress-service";
import { getProfile } from "@/lib/profile-service";
import { getSkillGraph } from "@/lib/skill-graph/skill-graph-service";
import type {
  PortfolioFactAtom,
  PortfolioFacts,
} from "@/lib/portfolio-intelligence/portfolio-intelligence-types";

/** Evidence types eligible as featured projects (proof-oriented). */
const FEATURED_PROJECT_TYPES = new Set([
  "completed_project",
  "github_activity",
  "portfolio",
  "boss_battle",
  "code_review",
]);

/** Evidence types that may appear on the learning timeline. */
const TIMELINE_EVIDENCE_TYPES = new Set([
  "completed_project",
  "course_completion",
  "github_activity",
  "portfolio",
  "code_review",
  "boss_battle",
  "interview",
  "external_validation",
  "reflection",
]);

const MAX_FEATURED = 8;
const MAX_TIMELINE = 20;
const MAX_SKILLS = 24;

export async function buildPortfolioFacts(
  supabase: SupabaseClient,
  userId: string,
): Promise<PortfolioFacts> {
  const profile = await getProfile(supabase, userId);
  if (!profile) {
    return emptyInsufficient(
      "Complete onboarding before composing a portfolio draft.",
    );
  }

  const [careerGraph, skillGraph, progress, evidenceRows, latestRec] =
    await Promise.all([
      getCareerGraph(supabase, userId),
      getSkillGraph(supabase, userId),
      getGoalProgressExplanation(supabase, userId),
      loadEvidence(supabase, userId),
      loadLatestRecommendation(supabase, userId),
    ]);

  const goal = careerGraph.rootGoal;
  const goalMeta = {
    title: goal?.title ?? null,
    status: goal?.status ?? null,
    deadline: goal?.deadline ?? null,
  };

  const atoms: PortfolioFactAtom[] = [];
  const push = (
    id: string,
    kind: string,
    label: string,
    value: string,
  ) => {
    atoms.push({ id, kind, label, value });
  };

  push("profile.display_name", "profile", "Display name", profile.display_name);
  push(
    "profile.current_profession",
    "profile",
    "Current profession",
    profile.current_profession,
  );
  push("profile.target_role", "profile", "Target role", profile.target_role);

  if (goal) {
    push("goal.title", "goal", "Active goal", goal.title);
    push("goal.status", "goal", "Goal status", goal.status);
    if (goal.deadline) {
      push("goal.deadline", "goal", "Goal deadline", goal.deadline);
    }
  } else {
    push("goal.absent", "goal", "Active goal", "No active goal on record");
  }

  push("progress.stage", "progress", "Roadmap stage", progress.currentStage);

  const unlocked = skillGraph.nodes
    .filter((n) => n.status !== "locked")
    .sort((a, b) => b.mastery - a.mastery || a.display_order - b.display_order)
    .slice(0, MAX_SKILLS);

  for (const node of unlocked) {
    push(
      `skill.${node.skill_key}`,
      "skill",
      node.name,
      `status=${node.status}; mastery=${node.mastery.toFixed(2)}; confidence=${node.confidence.toFixed(2)}; domain=${node.domain}`,
    );
  }
  if (unlocked.length === 0) {
    push(
      "skills.absent",
      "skill",
      "Skills",
      "No unlocked skills with overlay data",
    );
  }

  // Technologies: unique domains from unlocked skills only (never invent).
  const domains = [...new Set(unlocked.map((n) => n.domain))].sort();
  for (const domain of domains) {
    push(
      `technology.${domain}`,
      "technology",
      domain,
      `Derived from Skill Graph domain; not an external stack claim`,
    );
  }
  if (domains.length === 0) {
    push(
      "technologies.absent",
      "technology",
      "Technologies",
      "No technology domains derived from unlocked skills",
    );
  }

  // Featured projects: deterministic order — recorded_at DESC, then id ASC.
  const projectRows = evidenceRows
    .filter((e) => FEATURED_PROJECT_TYPES.has(e.type))
    .sort((a, b) => {
      const t = b.recorded_at.localeCompare(a.recorded_at);
      if (t !== 0) return t;
      return a.id.localeCompare(b.id);
    })
    .slice(0, MAX_FEATURED);

  const featuredProjectIds: string[] = [];
  for (const ev of projectRows) {
    const stableId = `project.${ev.id}`;
    featuredProjectIds.push(stableId);
    const skillName =
      skillGraph.nodes.find((n) => n.skill_key === ev.skill_key)?.name ??
      ev.skill_key;
    push(
      stableId,
      "project",
      `${ev.type} · ${skillName}`,
      `evidence_id=${ev.id}; type=${ev.type}; skill_key=${ev.skill_key}; recorded_at=${ev.recorded_at}; implied_mastery=${ev.implied_mastery}; content_ref=${ev.content_ref ?? "none"}`,
    );
  }
  if (featuredProjectIds.length === 0) {
    push(
      "projects.unavailable",
      "project",
      "Featured projects",
      "No verified project/portfolio/GitHub Evidence on record",
    );
  }

  // Learning journey: chronological ASC (oldest first), stable ids.
  const timelineRows = evidenceRows
    .filter((e) => TIMELINE_EVIDENCE_TYPES.has(e.type))
    .sort((a, b) => {
      const t = a.recorded_at.localeCompare(b.recorded_at);
      if (t !== 0) return t;
      return a.id.localeCompare(b.id);
    })
    .slice(0, MAX_TIMELINE);

  const learningJourneyIds: string[] = [];
  for (const ev of timelineRows) {
    const stableId = `timeline.${ev.id}`;
    learningJourneyIds.push(stableId);
    const skillName =
      skillGraph.nodes.find((n) => n.skill_key === ev.skill_key)?.name ??
      ev.skill_key;
    push(
      stableId,
      "timeline",
      `${ev.recorded_at.slice(0, 10)} · ${ev.type} · ${skillName}`,
      `evidence_id=${ev.id}; type=${ev.type}; skill_key=${ev.skill_key}; recorded_at=${ev.recorded_at}`,
    );
  }
  if (learningJourneyIds.length === 0) {
    push(
      "timeline.unavailable",
      "timeline",
      "Learning journey",
      "No timeline Evidence events on record",
    );
  }

  push(
    "certification.unavailable",
    "certification",
    "Certifications",
    "No verified certification records in CareerOS",
  );

  if (latestRec) {
    const recName =
      skillGraph.nodes.find((n) => n.skill_key === latestRec.skill_key)?.name ??
      latestRec.skill_key;
    push(
      "focus.recommendation",
      "focus",
      "Current Decision Engine focus",
      `${recName} (${latestRec.skill_key}); descriptive only`,
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
    "limits.not_resume",
    "limits",
    "Not a resume",
    "This portfolio is a proof showcase, not a hiring resume (ADR-0028).",
  );
  push(
    "limits.not_website",
    "limits",
    "Content only",
    "Portfolio Intelligence owns content only — not websites, themes, publishing, or hosting.",
  );
  push(
    "limits.no_invention",
    "limits",
    "No invention",
    "Do not invent projects, metrics, certifications, employers, or technologies absent from Portfolio Facts.",
  );

  push(
    "meta.evidence_count",
    "meta",
    "Evidence count",
    String(evidenceRows.length),
  );

  const hasIdentity =
    Boolean(profile.display_name?.trim()) || Boolean(goal?.title?.trim());
  const hasProof =
    featuredProjectIds.length > 0 ||
    unlocked.length > 0 ||
    learningJourneyIds.length > 0;
  const sufficient = hasIdentity && hasProof;

  return {
    sufficient,
    insufficientReason: sufficient
      ? null
      : "Need a profile/goal and at least one skill or verified Evidence signal before composing.",
    atoms,
    assembledAt: new Date().toISOString(),
    goal: goalMeta,
    evidenceCount: evidenceRows.length,
    featuredProjectIds,
    learningJourneyIds,
  };
}

export function hashPortfolioFacts(facts: PortfolioFacts): string {
  return createHash("sha256").update(JSON.stringify(facts)).digest("hex");
}

function emptyInsufficient(reason: string): PortfolioFacts {
  return {
    sufficient: false,
    insufficientReason: reason,
    atoms: [],
    assembledAt: new Date().toISOString(),
    goal: { title: null, status: null, deadline: null },
    evidenceCount: 0,
    featuredProjectIds: [],
    learningJourneyIds: [],
  };
}

async function loadEvidence(
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
    .limit(80);

  if (error) {
    throw new Error(
      `Failed to load evidence for portfolio facts: ${error.message}`,
    );
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
      `Failed to load recommendation for portfolio facts: ${error.message}`,
    );
  }
  if (!data) return null;
  return { skill_key: data.recommended_skill_key as string };
}
