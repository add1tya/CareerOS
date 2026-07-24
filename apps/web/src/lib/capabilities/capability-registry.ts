/**
 * Capability Registry — metadata catalog only (ADR-0027).
 *
 * Never executes capabilities. Never duplicates business logic.
 * List ordering is deterministic by capability id (not module init order).
 */

import { parseCapabilityManifest } from "@/lib/capabilities/capability-manifest-schema";
import type {
  CapabilityDiscoveryFilters,
  CapabilityManifest,
} from "@/lib/capabilities/capability-manifest-types";
import { CAPABILITY_REGISTRY_VERSION } from "@/lib/capabilities/capability-manifest-types";

const manifestsById = new Map<string, CapabilityManifest>();

export function resetCapabilityRegistryForTests(): void {
  manifestsById.clear();
}

/**
 * Register a validated manifest. Fails loud on duplicate id.
 * Does not execute the capability.
 */
export function registerCapability(input: unknown): CapabilityManifest {
  const manifest = parseCapabilityManifest(input);
  if (manifestsById.has(manifest.id)) {
    throw new Error(
      `Capability Registry: duplicate capability id "${manifest.id}". ids are immutable.`,
    );
  }
  manifestsById.set(manifest.id, manifest);
  return manifest;
}

export function getCapability(id: string): CapabilityManifest | null {
  return manifestsById.get(id) ?? null;
}

/**
 * Deterministic discovery: always sorted by `id` ascending.
 * Callers must bootstrap builtins before listing in production.
 */
export function listCapabilities(
  filters?: CapabilityDiscoveryFilters,
): CapabilityManifest[] {
  let items = [...manifestsById.values()];

  if (filters?.status) {
    items = items.filter((m) => m.status === filters.status);
  } else {
    items = items.filter((m) => m.status === "active");
  }
  if (filters?.mutability) {
    items = items.filter((m) => m.mutability === filters.mutability);
  }
  if (filters?.category) {
    items = items.filter((m) => m.category === filters.category);
  }
  if (filters?.tag) {
    items = items.filter((m) => m.tags.includes(filters.tag!));
  }
  if (typeof filters?.orchestratorInvokable === "boolean") {
    items = items.filter(
      (m) => m.orchestratorInvokable === filters.orchestratorInvokable,
    );
  }

  return sortByCapabilityId(items);
}

export function getCapabilityRegistryMeta(): {
  registryVersion: number;
  count: number;
} {
  return {
    registryVersion: CAPABILITY_REGISTRY_VERSION,
    count: manifestsById.size,
  };
}

function sortByCapabilityId(
  items: CapabilityManifest[],
): CapabilityManifest[] {
  return [...items].sort((a, b) => a.id.localeCompare(b.id));
}
