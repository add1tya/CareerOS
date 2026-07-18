/**
 * Mastery policy (Sprint 7) — PURE, DETERMINISTIC, VERSIONED.
 *
 * The reducer that turns Evidence into Mastery/Confidence/status. It is a pure
 * fold over the append-only Evidence log: no I/O, no clock, no randomness, and
 * no embedded domain constants (those live in ./evidence-types as config).
 *
 *  - `applyEvidence` folds ONE Evidence record into the running state — used by
 *    the incremental service path.
 *  - `replaySkillOverlay` folds an ORDERED list from empty — the reference
 *    implementation of replayability (ADR-0004). Because both paths call the
 *    same `applyEvidence`, the incremental cache is guaranteed to equal a full
 *    replay of the same Evidence.
 *
 * Bumping MASTERY_POLICY_VERSION signals a change in how Evidence is
 * interpreted; the version is snapshotted onto every Evidence row so historical
 * Evidence remains replayable under the exact policy that produced it.
 */
import type { SkillStatus } from "@/lib/skill-graph/types";

import {
  STATUS_THRESHOLDS,
  TIER_CONFIDENCE_CEILING,
  type EvidenceTier,
  type PolicyEvidence,
} from "./evidence-types";

/** Version of the interpretation rules below. Snapshot onto Evidence at write. */
export const MASTERY_POLICY_VERSION = 1;

/** No-evidence tier sentinel. */
export type TierOrNone = EvidenceTier | 0;

/** The reducible state — everything needed to fold in the next Evidence. */
export type MasteryState = {
  mastery: number;
  confidence: number;
  highestTier: TierOrNone;
  evidenceCount: number;
};

export const EMPTY_MASTERY_STATE: MasteryState = {
  mastery: 0,
  confidence: 0,
  highestTier: 0,
  evidenceCount: 0,
};

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function ceilingForTier(tier: TierOrNone): number {
  return tier === 0 ? 0 : TIER_CONFIDENCE_CEILING[tier];
}

/**
 * Folds one Evidence record into the running state (skill-graph-schema.md §5.6).
 *
 * Mastery: weighted blend toward the evidence's implied value, with the tier's
 * confidence ceiling as the learning rate (high-tier evidence moves mastery
 * sharply, self-report only nudges it). Never decreases — mastery is historical
 * fact (§5.7).
 *
 * Confidence: the ceiling of the highest tier ever attached, non-additive
 * (§7 / AD-11). Independent of mastery.
 */
export function applyEvidence(
  state: MasteryState,
  evidence: PolicyEvidence,
): MasteryState {
  const rate = TIER_CONFIDENCE_CEILING[evidence.tier];
  const blended = state.mastery + (evidence.impliedMastery - state.mastery) * rate;
  const mastery = clamp01(Math.max(state.mastery, blended));

  const highestTier: TierOrNone =
    evidence.tier > state.highestTier ? evidence.tier : state.highestTier;
  const confidence = clamp01(
    Math.max(state.confidence, ceilingForTier(highestTier)),
  );

  return {
    mastery,
    confidence,
    highestTier,
    evidenceCount: state.evidenceCount + 1,
  };
}

/**
 * Derives the discrete Skill status from continuous values + highest tier
 * (skill-graph-schema.md §4). System-triggered only; never client-set. Mastery
 * and confidence only ever rise here, so no regression is possible (§4.1).
 */
export function deriveStatus(params: {
  unlocked: boolean;
  mastery: number;
  confidence: number;
  hasEvidence: boolean;
  highestTier: TierOrNone;
}): SkillStatus {
  const { unlocked, mastery, confidence, hasEvidence, highestTier } = params;

  if (!unlocked) return "locked";
  if (!hasEvidence) return "available";

  if (
    mastery >= STATUS_THRESHOLDS.masteredMastery &&
    confidence >= STATUS_THRESHOLDS.masteredConfidence
  ) {
    return "mastered";
  }

  if (
    highestTier >= STATUS_THRESHOLDS.verifiedMinTier &&
    mastery >= STATUS_THRESHOLDS.verifiedMastery &&
    confidence >= STATUS_THRESHOLDS.verifiedConfidence
  ) {
    return "verified";
  }

  if (mastery >= STATUS_THRESHOLDS.practicingMastery) {
    return "practicing";
  }

  return "learning";
}

/** One Evidence record as the replay reducer consumes it. */
export type ReplayEvidence = PolicyEvidence & { id: string };

export type ReplayResult = MasteryState & {
  status: SkillStatus;
  lastEvidenceId: string | null;
  highestTierEvidenceId: string | null;
};

/**
 * Reference implementation of replayability (ADR-0004): reduces an ordered
 * Evidence list for one skill from empty to the current overlay values. The
 * incremental service performs the same fold one record at a time; this exists
 * to prove the overlay is a disposable cache derivable from the Evidence log.
 */
export function replaySkillOverlay(
  evidence: ReplayEvidence[],
  unlocked: boolean,
): ReplayResult {
  let state = EMPTY_MASTERY_STATE;
  let lastEvidenceId: string | null = null;
  let highestTierEvidenceId: string | null = null;
  let highestTierSoFar: TierOrNone = 0;

  for (const record of evidence) {
    state = applyEvidence(state, record);
    lastEvidenceId = record.id;
    if (record.tier > highestTierSoFar) {
      highestTierSoFar = record.tier;
      highestTierEvidenceId = record.id;
    }
  }

  const status = deriveStatus({
    unlocked,
    mastery: state.mastery,
    confidence: state.confidence,
    hasEvidence: state.evidenceCount > 0,
    highestTier: state.highestTier,
  });

  return { ...state, status, lastEvidenceId, highestTierEvidenceId };
}
