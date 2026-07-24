import { describe, expect, it, beforeEach } from "vitest";

import { parseCapabilityManifest } from "@/lib/capabilities/capability-manifest-schema";
import { CAPABILITY_MANIFEST_SCHEMA_VERSION } from "@/lib/capabilities/capability-manifest-types";
import {
  getCapability,
  listCapabilities,
  registerCapability,
  resetCapabilityRegistryForTests,
} from "@/lib/capabilities/capability-registry";
import {
  bootstrapBuiltinCapabilities,
  resetBuiltinBootstrapForTests,
} from "@/lib/capabilities/register-builtin-capabilities";
import {
  discoverCapabilities,
  discoverCapability,
} from "@/lib/capabilities/capability-discovery";

function validManifest(overrides: Record<string, unknown> = {}) {
  return {
    id: "utility.test_cap",
    displayName: "Test Cap",
    description: "A test capability for registry unit tests.",
    category: "utility",
    kind: "other",
    mutability: "read_only",
    capabilityVersion: 1,
    manifestVersion: CAPABILITY_MANIFEST_SCHEMA_VERSION,
    adapterTaskType: null,
    requiredSlots: [],
    dependsOn: ["evidence.extract"],
    outputRef: "test output",
    deepLinkPath: "/capabilities",
    tags: ["test"],
    status: "active",
    orchestratorInvokable: false,
    ...overrides,
  };
}

describe("capabilityManifestSchema", () => {
  it("accepts a valid manifest with optional dependsOn metadata", () => {
    const parsed = parseCapabilityManifest(validManifest());
    expect(parsed.id).toBe("utility.test_cap");
    expect(parsed.dependsOn).toEqual(["evidence.extract"]);
    expect(parsed.displayName).toBe("Test Cap");
  });

  it("rejects self-dependency", () => {
    expect(() =>
      parseCapabilityManifest(
        validManifest({ dependsOn: ["utility.test_cap"] }),
      ),
    ).toThrow(/own id/);
  });

  it("rejects invalid id shape", () => {
    expect(() =>
      parseCapabilityManifest(validManifest({ id: "Bad Id" })),
    ).toThrow();
  });
});

describe("capabilityRegistry", () => {
  beforeEach(() => {
    resetCapabilityRegistryForTests();
    resetBuiltinBootstrapForTests();
  });

  it("fails loud on duplicate id", () => {
    registerCapability(validManifest());
    expect(() => registerCapability(validManifest())).toThrow(/duplicate/);
  });

  it("lists in deterministic id order regardless of registration order", () => {
    registerCapability(validManifest({ id: "utility.zebra" }));
    registerCapability(
      validManifest({ id: "utility.alpha", dependsOn: [] }),
    );
    registerCapability(
      validManifest({ id: "utility.middle", dependsOn: [] }),
    );
    const ids = listCapabilities().map((m) => m.id);
    expect(ids).toEqual(["utility.alpha", "utility.middle", "utility.zebra"]);
  });

  it("looks up by immutable id, not displayName", () => {
    registerCapability(
      validManifest({
        id: "utility.lookup",
        displayName: "Pretty Name",
        dependsOn: [],
      }),
    );
    expect(getCapability("utility.lookup")?.displayName).toBe("Pretty Name");
    expect(getCapability("Pretty Name")).toBeNull();
  });
});

describe("builtin discovery", () => {
  beforeEach(() => {
    resetCapabilityRegistryForTests();
    resetBuiltinBootstrapForTests();
  });

  it("registers Adapter consumers sorted by id", () => {
    bootstrapBuiltinCapabilities();
    const ids = listCapabilities().map((m) => m.id);
    expect(ids).toEqual([
      "career.gap_analysis",
      "evidence.extract",
      "portfolio.compose",
      "resume.compose",
      "trace.narrate",
    ]);
  });

  it("discoverCapabilities returns the same deterministic order", () => {
    const a = discoverCapabilities().map((m) => m.id);
    const b = discoverCapabilities().map((m) => m.id);
    expect(a).toEqual(b);
    expect(a[0]).toBe("career.gap_analysis");
  });

  it("distinguishes confirmation_gated evidence.extract", () => {
    const extract = discoverCapability("evidence.extract");
    expect(extract?.mutability).toBe("confirmation_gated");
    expect(extract?.category).toBe("ai_projection");
  });

  it("filters orchestratorInvokable", () => {
    const invokable = discoverCapabilities({ orchestratorInvokable: true });
    expect(invokable.length).toBe(5);
  });
});
