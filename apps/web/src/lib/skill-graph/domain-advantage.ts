/**
 * Domain Advantage rules (Sprint 4 / M4).
 *
 * A Domain Advantage is background-derived transfer credit: prior experience
 * that makes certain ontology skills faster to reach mastery in
 * (career-graph-schema.md §3.6, ai-engineering-knowledge-model.md §5.3).
 *
 * HONESTY CONSTRAINT (explicit product requirement):
 * We do NOT invent mastery magnitudes. The ontology documents *which* skills a
 * background transfers to (e.g. a mechanical-engineering background transfers to
 * Linear Algebra, Calculus, Optimization), but the *amount* of mastery to seed
 * is not yet calibrated (roadmap OQ-05 / OQ-01). So `masterySeed` is left null.
 *
 * Effect during generation: matched skills are still initialized at mastery 0 /
 * confidence 0, but tagged `source = 'domain_advantage'` so the provenance is
 * recorded. When calibration is documented, set `masterySeed` (and a matching
 * confidence ceiling) here — a single, reviewable place to tune.
 */
import type { MasterySource } from "@/lib/skill-graph/types";

export type DomainAdvantageRule = {
  /** Stable identifier for this background rule. */
  id: string;
  /** Lowercased substrings matched against the user's current profession. */
  matchKeywords: string[];
  /** Ontology skills this background is documented to transfer to. */
  affectedSkillKeys: string[];
  /**
   * Mastery to seed for affected skills. Intentionally null until calibrated —
   * do not invent a value. Null => provenance is recorded, mastery stays 0.
   */
  masterySeed: number | null;
};

/**
 * V1 rules. Only the mechanical/engineering transfer is documented in the
 * ontology (Linear Algebra, Calculus, Optimization entries explicitly call it
 * out). Add more rules here as they are documented — never speculatively.
 */
export const DOMAIN_ADVANTAGE_RULES: DomainAdvantageRule[] = [
  {
    id: "engineering-math-transfer",
    matchKeywords: [
      "mechanical engineer",
      "mechanical engineering",
      "aerospace",
      "civil engineer",
      "electrical engineer",
      "physics",
    ],
    affectedSkillKeys: ["linear-algebra", "calculus", "optimization"],
    masterySeed: null, // TODO: calibrate (roadmap OQ-05); do not invent a value.
  },
];

export type DomainAdvantageSeed = {
  mastery: number;
  confidence: number;
  source: MasterySource;
};

/**
 * Returns, for a given profession, the per-skill seed overlay implied by
 * Domain Advantage rules. Deterministic and honest: with uncalibrated rules
 * this records provenance (`source`) without fabricating mastery.
 */
export function domainAdvantageSeeds(
  currentProfession: string,
): Map<string, DomainAdvantageSeed> {
  const profession = currentProfession.toLowerCase();
  const seeds = new Map<string, DomainAdvantageSeed>();

  for (const rule of DOMAIN_ADVANTAGE_RULES) {
    const matches = rule.matchKeywords.some((keyword) =>
      profession.includes(keyword),
    );
    if (!matches) continue;

    for (const skillKey of rule.affectedSkillKeys) {
      seeds.set(skillKey, {
        // Placeholder-honest: 0 until masterySeed is calibrated.
        mastery: rule.masterySeed ?? 0,
        confidence: 0,
        source: "domain_advantage",
      });
    }
  }

  return seeds;
}
