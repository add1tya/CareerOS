/**
 * Override types + configuration (Sprint 12 / M12).
 *
 * Override = persisted user intent (append-only rows).
 * Suppression = derived eligibility policy — NEVER stored (ADR-0009).
 *
 * Distinct from mastery Self Report Override Evidence (skill-graph-schema.md
 * §5.5), which is deferred. This sprint covers recommendation/task overrides only.
 */
export const OVERRIDE_SCHEMA_VERSION = 1;

export const OVERRIDE_KINDS = [
  "recommendation_overridden",
  "task_skipped",
] as const;

export type OverrideKind = (typeof OVERRIDE_KINDS)[number];

/**
 * Structured reason codes. Used for eligibility / analytics later — NEVER for
 * ranking scores (refinement 3). Free-text notes are not interpreted.
 */
export const OVERRIDE_REASON_CODES = [
  "too_hard",
  "not_relevant_now",
  "wrong_focus",
  "need_break",
  "other",
] as const;

export type OverrideReasonCode = (typeof OVERRIDE_REASON_CODES)[number];

export const OVERRIDE_REASON_LABELS: Record<OverrideReasonCode, string> = {
  too_hard: "Too hard right now",
  not_relevant_now: "Not relevant to my current focus",
  wrong_focus: "Wrong skill / wrong focus",
  need_break: "Need a break from this",
  other: "Other",
};

export type OverrideRecord = {
  id: string;
  kind: OverrideKind;
  skillKey: string;
  recommendationId: string | null;
  taskId: string | null;
  reasonCode: OverrideReasonCode;
  reasonText: string | null;
  overrideSchemaVersion: number;
  createdAt: string;
};

/** Facts the pure suppression policy needs from a recommendation override. */
export type OverrideFact = {
  skillKey: string;
  createdAt: string;
};

/** Facts the pure suppression policy needs from Evidence. */
export type EvidenceFact = {
  skillKey: string;
  recordedAt: string;
};
