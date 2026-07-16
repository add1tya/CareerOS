/**
 * Skill Graph generation (Sprint 4 / M4).
 *
 * Deterministically instantiates a user's Skill Graph from the GLOBAL ontology
 * plus their profile (Career Goal, Current Profession, Domain Advantage rules),
 * and persists only the PER-USER overlay (`user_skill_mastery`).
 *
 * Deterministic: identical inputs -> identical output (AR-08). No Evidence, no
 * confidence decay, no recommendations, no Claude.
 *
 * Idempotency: `profiles.skill_graph_generated_at` is the guard — once set, this
 * is a no-op.
 *
 * V1 scope note: the Career Goal (target role) does not prune the graph — the
 * whole AI-engineering ontology is the map the future Decision Engine routes
 * over. Goal-specific relevance weighting is deferred (Decision Engine, not M4).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { getProfile } from "@/lib/profile-service";
import { domainAdvantageSeeds } from "@/lib/skill-graph/domain-advantage";
import type {
  Skill,
  SkillDependency,
  SkillGraph,
  SkillGraphNode,
  SkillStatus,
  MasterySource,
} from "@/lib/skill-graph/types";

type OverlayRow = {
  user_id: string;
  skill_key: string;
  mastery: number;
  confidence: number;
  status: SkillStatus;
  source: MasterySource;
};

async function loadOntology(
  supabase: SupabaseClient,
): Promise<{ skills: Skill[]; dependencies: SkillDependency[] }> {
  const [{ data: skills, error: skillsError }, { data: deps, error: depsError }] =
    await Promise.all([
      supabase.from("skills").select("*").order("display_order", { ascending: true }),
      supabase.from("skill_dependencies").select("*"),
    ]);

  if (skillsError) {
    throw new Error(`Failed to load skills ontology: ${skillsError.message}`);
  }
  if (depsError) {
    throw new Error(`Failed to load skill dependencies: ${depsError.message}`);
  }
  if (!skills || skills.length === 0) {
    // Fail loud (AR-13): the ontology seed migration has not been applied.
    throw new Error(
      "Skills ontology is empty — apply the ontology seed migration before generating a Skill Graph.",
    );
  }

  return {
    skills: skills as Skill[],
    dependencies: (deps as SkillDependency[] | null) ?? [],
  };
}

/**
 * Computes the per-user overlay rows from the ontology + profile.
 * Pure and deterministic given its inputs (no I/O, no clock, no randomness).
 */
export function computeOverlay(
  userId: string,
  skills: Skill[],
  dependencies: SkillDependency[],
  currentProfession: string,
): OverlayRow[] {
  const advantage = domainAdvantageSeeds(currentProfession);

  // Seed mastery/confidence/source per skill.
  const mastery = new Map<string, number>();
  const confidence = new Map<string, number>();
  const source = new Map<string, MasterySource>();

  for (const skill of skills) {
    const seed = advantage.get(skill.skill_key);
    mastery.set(skill.skill_key, seed?.mastery ?? 0);
    confidence.set(skill.skill_key, seed?.confidence ?? 0);
    source.set(skill.skill_key, seed?.source ?? "system");
  }

  // A skill is `available` only if every HARD prerequisite meets its threshold.
  // Status depends on seeded parent mastery, so a single pass is sufficient.
  const hardParents = new Map<string, SkillDependency[]>();
  for (const dep of dependencies) {
    if (dep.type !== "hard") continue;
    const list = hardParents.get(dep.child_skill_key) ?? [];
    list.push(dep);
    hardParents.set(dep.child_skill_key, list);
  }

  return skills.map((skill) => {
    const own = mastery.get(skill.skill_key) ?? 0;
    const parents = hardParents.get(skill.skill_key) ?? [];
    const unlocked = parents.every(
      (dep) => (mastery.get(dep.parent_skill_key) ?? 0) >= dep.minimum_mastery,
    );

    let status: SkillStatus;
    if (!unlocked) {
      status = "locked";
    } else if (own > 0) {
      status = "learning";
    } else {
      status = "available";
    }

    return {
      user_id: userId,
      skill_key: skill.skill_key,
      mastery: own,
      confidence: confidence.get(skill.skill_key) ?? 0,
      status,
      source: source.get(skill.skill_key) ?? "system",
    };
  });
}

/**
 * Idempotently generates and persists the user's Skill Graph overlay.
 * Safe to call repeatedly: a no-op once `skill_graph_generated_at` is set.
 */
export async function generateSkillGraph(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const profile = await getProfile(supabase, userId);

  if (!profile) {
    throw new Error("Cannot generate Skill Graph before onboarding.");
  }
  if (profile.skill_graph_generated_at) {
    return;
  }

  const { skills, dependencies } = await loadOntology(supabase);
  const rows = computeOverlay(
    userId,
    skills,
    dependencies,
    profile.current_profession,
  );

  const { error: overlayError } = await supabase
    .from("user_skill_mastery")
    .upsert(rows, { onConflict: "user_id,skill_key" });

  if (overlayError) {
    throw new Error(`Failed to persist Skill Graph: ${overlayError.message}`);
  }

  const { error: flagError } = await supabase
    .from("profiles")
    .update({ skill_graph_generated_at: new Date().toISOString() })
    .eq("user_id", userId);

  if (flagError) {
    throw new Error(`Failed to mark Skill Graph generated: ${flagError.message}`);
  }
}

/**
 * Loads the assembled Skill Graph (ontology joined with the user's overlay)
 * for read-only display. Ordered by ontology display_order.
 */
export async function getSkillGraph(
  supabase: SupabaseClient,
  userId: string,
): Promise<SkillGraph> {
  const { skills, dependencies } = await loadOntology(supabase);

  const { data: overlay, error: overlayError } = await supabase
    .from("user_skill_mastery")
    .select("skill_key, mastery, confidence, status, source")
    .eq("user_id", userId);

  if (overlayError) {
    throw new Error(`Failed to load Skill Graph overlay: ${overlayError.message}`);
  }

  const overlayByKey = new Map(
    (overlay ?? []).map((row) => [row.skill_key as string, row]),
  );

  const nodes: SkillGraphNode[] = skills.map((skill) => {
    const row = overlayByKey.get(skill.skill_key);
    return {
      ...skill,
      mastery: row ? Number(row.mastery) : 0,
      confidence: row ? Number(row.confidence) : 0,
      status: (row?.status as SkillStatus) ?? "locked",
      source: (row?.source as MasterySource) ?? "system",
    };
  });

  return { nodes, edges: dependencies };
}
