/**
 * Capability discovery facade (ADR-0027).
 *
 * Ensures builtins are registered, then exposes registry reads.
 * Never executes capabilities.
 */

import {
  getCapability,
  getCapabilityRegistryMeta,
  listCapabilities,
} from "@/lib/capabilities/capability-registry";
import type {
  CapabilityDiscoveryFilters,
  CapabilityManifest,
} from "@/lib/capabilities/capability-manifest-types";
import {
  CAPABILITY_MANIFEST_SCHEMA_VERSION,
  CAPABILITY_REGISTRY_VERSION,
} from "@/lib/capabilities/capability-manifest-types";
import { bootstrapBuiltinCapabilities } from "@/lib/capabilities/register-builtin-capabilities";

export function discoverCapabilities(
  filters?: CapabilityDiscoveryFilters,
): CapabilityManifest[] {
  bootstrapBuiltinCapabilities();
  return listCapabilities(filters);
}

export function discoverCapability(id: string): CapabilityManifest | null {
  bootstrapBuiltinCapabilities();
  return getCapability(id);
}

export function discoverRegistryInfo(): {
  registryVersion: number;
  manifestSchemaVersion: number;
  count: number;
} {
  bootstrapBuiltinCapabilities();
  const meta = getCapabilityRegistryMeta();
  return {
    registryVersion: CAPABILITY_REGISTRY_VERSION,
    manifestSchemaVersion: CAPABILITY_MANIFEST_SCHEMA_VERSION,
    count: meta.count,
  };
}
