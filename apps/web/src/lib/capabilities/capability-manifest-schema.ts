/**
 * Zod schema for Capability Manifests (ADR-0027).
 */

import { z } from "zod";

import {
  CAPABILITY_CATEGORIES,
  CAPABILITY_KINDS,
  CAPABILITY_MANIFEST_SCHEMA_VERSION,
  CAPABILITY_MUTABILITIES,
  CAPABILITY_SLOT_TYPES,
  CAPABILITY_STATUSES,
} from "@/lib/capabilities/capability-manifest-types";

const capabilitySlotSchema = z.object({
  name: z.string().min(1).max(64),
  type: z.enum(CAPABILITY_SLOT_TYPES),
  required: z.boolean(),
  description: z.string().min(1).max(400),
});

export const capabilityManifestSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .max(128)
      .regex(
        /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/,
        "Capability id must be a stable dotted snake token (e.g. career.gap_analysis).",
      ),
    displayName: z.string().min(1).max(120),
    description: z.string().min(1).max(800),
    category: z.enum(CAPABILITY_CATEGORIES),
    kind: z.enum(CAPABILITY_KINDS),
    mutability: z.enum(CAPABILITY_MUTABILITIES),
    capabilityVersion: z.number().int().positive(),
    manifestVersion: z
      .number()
      .int()
      .positive()
      .refine((v) => v === CAPABILITY_MANIFEST_SCHEMA_VERSION, {
        message: `manifestVersion must equal CAPABILITY_MANIFEST_SCHEMA_VERSION (${CAPABILITY_MANIFEST_SCHEMA_VERSION}).`,
      }),
    adapterTaskType: z.string().min(1).max(128).nullable(),
    requiredSlots: z.array(capabilitySlotSchema).max(20),
    dependsOn: z.array(z.string().min(1).max(128)).max(20),
    outputRef: z.string().min(1).max(400),
    deepLinkPath: z
      .string()
      .min(1)
      .max(200)
      .regex(/^\//, "deepLinkPath must start with /")
      .nullable(),
    tags: z.array(z.string().min(1).max(64)).max(20),
    status: z.enum(CAPABILITY_STATUSES),
    orchestratorInvokable: z.boolean(),
  })
  .superRefine((val, ctx) => {
    const slotNames = new Set<string>();
    for (const slot of val.requiredSlots) {
      if (slotNames.has(slot.name)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate slot name "${slot.name}".`,
          path: ["requiredSlots"],
        });
      }
      slotNames.add(slot.name);
    }
    const deps = new Set<string>();
    for (const dep of val.dependsOn) {
      if (dep === val.id) {
        ctx.addIssue({
          code: "custom",
          message: "dependsOn must not include the capability's own id.",
          path: ["dependsOn"],
        });
      }
      if (deps.has(dep)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate dependsOn id "${dep}".`,
          path: ["dependsOn"],
        });
      }
      deps.add(dep);
    }
  });

export type ParsedCapabilityManifest = z.infer<typeof capabilityManifestSchema>;

export function parseCapabilityManifest(
  input: unknown,
): ParsedCapabilityManifest {
  return capabilityManifestSchema.parse(input);
}
