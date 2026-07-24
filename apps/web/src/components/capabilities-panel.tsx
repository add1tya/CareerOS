/**
 * Capability discovery panel (ADR-0027).
 * Presentation only — never invokes capabilities.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CAPABILITY_CATEGORY_LABELS,
  type CapabilityManifest,
} from "@/lib/capabilities/capability-manifest-types";

export function CapabilitiesPanel({
  capabilities,
  info,
}: {
  capabilities: CapabilityManifest[];
  info: {
    registryVersion: number;
    manifestSchemaVersion: number;
    count: number;
  };
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Registry v{info.registryVersion} · Manifest schema v
        {info.manifestSchemaVersion} · {info.count} registered
      </p>
      {capabilities.map((cap) => (
        <Card key={cap.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{cap.displayName}</CardTitle>
            <p className="font-mono text-xs text-muted-foreground">{cap.id}</p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{cap.description}</p>
            <dl className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
              <div>
                Category: {CAPABILITY_CATEGORY_LABELS[cap.category]}
              </div>
              <div>Mutability: {cap.mutability}</div>
              <div>Capability v{cap.capabilityVersion}</div>
              <div>
                Orchestrator invokable:{" "}
                {cap.orchestratorInvokable ? "yes" : "no"}
              </div>
              <div className="sm:col-span-2">
                Depends on:{" "}
                {cap.dependsOn.length > 0 ? cap.dependsOn.join(", ") : "—"}
              </div>
              {cap.deepLinkPath ? (
                <div className="sm:col-span-2">
                  Deep link:{" "}
                  <a
                    href={cap.deepLinkPath}
                    className="text-foreground underline-offset-2 hover:underline"
                  >
                    {cap.deepLinkPath}
                  </a>
                </div>
              ) : null}
            </dl>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
