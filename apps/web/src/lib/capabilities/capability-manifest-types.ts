/**
 * Capability Registry types (ADR-0027).
 *
 * CAPABILITY_REGISTRY_VERSION and CAPABILITY_MANIFEST_SCHEMA_VERSION are
 * independent of AI_ADAPTER_VERSION and per-capability product versions.
 *
 * Capability `id` is immutable. `displayName` is presentation only.
 */

/** Bump when registry behavior or discovery API contract changes. */
export const CAPABILITY_REGISTRY_VERSION = 1;

/** Bump when the Capability Manifest document shape changes. */
export const CAPABILITY_MANIFEST_SCHEMA_VERSION = 1;

/**
 * Categories for future discovery UIs.
 * Stored as stable snake ids; UI maps to labels.
 */
export const CAPABILITY_CATEGORIES = [
  "ai_projection",
  "ai_orchestration",
  "infrastructure",
  "utility",
] as const;

export type CapabilityCategory = (typeof CAPABILITY_CATEGORIES)[number];

export const CAPABILITY_CATEGORY_LABELS: Record<CapabilityCategory, string> = {
  ai_projection: "AI Projection",
  ai_orchestration: "AI Orchestration",
  infrastructure: "Infrastructure",
  utility: "Utility",
};

export const CAPABILITY_MUTABILITIES = [
  "read_only",
  "mutating",
  "confirmation_gated",
] as const;

export type CapabilityMutability = (typeof CAPABILITY_MUTABILITIES)[number];

export const CAPABILITY_KINDS = [
  "ai_adapter_consumer",
  "deterministic_projection",
  "other",
] as const;

export type CapabilityKind = (typeof CAPABILITY_KINDS)[number];

export const CAPABILITY_STATUSES = ["active", "deprecated"] as const;
export type CapabilityStatus = (typeof CAPABILITY_STATUSES)[number];

export const CAPABILITY_SLOT_TYPES = [
  "string",
  "uuid",
  "text",
  "enum",
] as const;

export type CapabilitySlotType = (typeof CAPABILITY_SLOT_TYPES)[number];

export type CapabilitySlot = {
  name: string;
  type: CapabilitySlotType;
  required: boolean;
  description: string;
};

/**
 * Self-description of one capability. Metadata only — never executable.
 * Internal references must use `id`, never `displayName`.
 */
export type CapabilityManifest = {
  /** Immutable stable identity. */
  id: string;
  /** Presentation only — not used for lookups. */
  displayName: string;
  description: string;
  category: CapabilityCategory;
  kind: CapabilityKind;
  mutability: CapabilityMutability;
  /** Product capability version (e.g. GAP_ANALYSIS_VERSION). */
  capabilityVersion: number;
  /** Manifest document shape version for this entry. */
  manifestVersion: number;
  adapterTaskType: string | null;
  requiredSlots: CapabilitySlot[];
  /**
   * Optional dependency capability ids (metadata only).
   * Registry never resolves or executes them.
   */
  dependsOn: string[];
  outputRef: string;
  deepLinkPath: string | null;
  tags: string[];
  status: CapabilityStatus;
  /** Whether orchestrators such as Copilot may invoke this capability. */
  orchestratorInvokable: boolean;
};

export type CapabilityDiscoveryFilters = {
  mutability?: CapabilityMutability;
  category?: CapabilityCategory;
  tag?: string;
  orchestratorInvokable?: boolean;
  status?: CapabilityStatus;
};
