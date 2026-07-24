/**
 * Bootstrap built-in Capability Manifests into the registry (ADR-0027).
 *
 * Registration order does not affect discovery order (list sorts by id).
 */

import { BUILTIN_CAPABILITY_MANIFESTS } from "@/lib/capabilities/manifests/builtin-manifests";
import { registerCapability } from "@/lib/capabilities/capability-registry";

let builtinsRegistered = false;

export function bootstrapBuiltinCapabilities(): void {
  if (builtinsRegistered) return;
  for (const manifest of BUILTIN_CAPABILITY_MANIFESTS) {
    registerCapability(manifest);
  }
  builtinsRegistered = true;
}

/** Test helper — allows re-bootstrap after resetCapabilityRegistryForTests. */
export function resetBuiltinBootstrapForTests(): void {
  builtinsRegistered = false;
}
