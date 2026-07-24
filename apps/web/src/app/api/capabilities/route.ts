import { NextResponse } from "next/server";

import {
  discoverCapabilities,
  discoverRegistryInfo,
} from "@/lib/capabilities/capability-discovery";
import type {
  CapabilityCategory,
  CapabilityMutability,
} from "@/lib/capabilities/capability-manifest-types";
import {
  CAPABILITY_CATEGORIES,
  CAPABILITY_MUTABILITIES,
} from "@/lib/capabilities/capability-manifest-types";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/capabilities — discover Capability Manifests (metadata only).
 * Query: mutability, category, tag, orchestratorInvokable=true|false
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const mutabilityRaw = url.searchParams.get("mutability");
  const categoryRaw = url.searchParams.get("category");
  const tag = url.searchParams.get("tag") ?? undefined;
  const orchRaw = url.searchParams.get("orchestratorInvokable");

  if (
    mutabilityRaw &&
    !CAPABILITY_MUTABILITIES.includes(mutabilityRaw as CapabilityMutability)
  ) {
    return NextResponse.json(
      { error: "Invalid mutability filter." },
      { status: 400 },
    );
  }
  if (
    categoryRaw &&
    !CAPABILITY_CATEGORIES.includes(categoryRaw as CapabilityCategory)
  ) {
    return NextResponse.json(
      { error: "Invalid category filter." },
      { status: 400 },
    );
  }

  let orchestratorInvokable: boolean | undefined;
  if (orchRaw === "true") orchestratorInvokable = true;
  else if (orchRaw === "false") orchestratorInvokable = false;
  else if (orchRaw != null) {
    return NextResponse.json(
      { error: "orchestratorInvokable must be true or false." },
      { status: 400 },
    );
  }

  const capabilities = discoverCapabilities({
    mutability: mutabilityRaw as CapabilityMutability | undefined,
    category: categoryRaw as CapabilityCategory | undefined,
    tag,
    orchestratorInvokable,
  });
  const info = discoverRegistryInfo();

  return NextResponse.json(
    {
      registryVersion: info.registryVersion,
      manifestSchemaVersion: info.manifestSchemaVersion,
      capabilities,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
