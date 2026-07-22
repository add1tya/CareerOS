/**
 * Pure suppression policy (Sprint 12 / M12).
 *
 * Suppression is COMPUTED from overrides + evidence — never stored, never flagged
 * active/inactive on rows (refinements 1–2, ADR-0009).
 *
 * V1 rule for recommendation overrides:
 *   A skill is suppressed iff its latest `recommendation_overridden` override
 *   has no Evidence recorded AFTER that override's created_at.
 *
 * Task skips do not suppress recommendation eligibility (skip ≠ reject skill).
 * Reason codes never enter this function's output beyond which overrides exist.
 */
import type { EvidenceFact, OverrideFact } from "@/lib/override/override-types";

/**
 * Returns the set of skill_keys that must be excluded from the recommendation
 * candidate pool (and from Roadmap forward sequencing). Deterministic.
 */
export function computeSuppressedSkillKeys(
  recommendationOverrides: readonly OverrideFact[],
  evidence: readonly EvidenceFact[],
): ReadonlySet<string> {
  // Latest recommendation override per skill.
  const latestOverrideBySkill = new Map<string, string>();
  for (const override of recommendationOverrides) {
    const prev = latestOverrideBySkill.get(override.skillKey);
    if (!prev || override.createdAt > prev) {
      latestOverrideBySkill.set(override.skillKey, override.createdAt);
    }
  }

  // Latest evidence timestamp per skill.
  const latestEvidenceBySkill = new Map<string, string>();
  for (const row of evidence) {
    const prev = latestEvidenceBySkill.get(row.skillKey);
    if (!prev || row.recordedAt > prev) {
      latestEvidenceBySkill.set(row.skillKey, row.recordedAt);
    }
  }

  const suppressed = new Set<string>();
  for (const [skillKey, overrideAt] of latestOverrideBySkill) {
    const evidenceAt = latestEvidenceBySkill.get(skillKey);
    if (!evidenceAt || evidenceAt <= overrideAt) {
      suppressed.add(skillKey);
    }
  }
  return suppressed;
}

/** Eligibility filter — does not change ranking scores. */
export function excludeSuppressed<T extends { skill_key: string }>(
  candidates: readonly T[],
  suppressed: ReadonlySet<string>,
): T[] {
  if (suppressed.size === 0) return [...candidates];
  return candidates.filter((node) => !suppressed.has(node.skill_key));
}
