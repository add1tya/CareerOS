"use client";

/**
 * Adapter Status panel (Sprint 23 / ADR-0020).
 *
 * Answers: "Is the AI adapter configured, and can it complete a validated diagnostic?"
 * Infrastructure smoke test only — not Mentor Chat or recommendations.
 */

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  AdapterDiagnosticOutput,
  AiAdapterStatus,
  AiProvenance,
} from "@/lib/ai/ai-adapter-types";

type DiagnosticOk = {
  kind: "ok";
  output: AdapterDiagnosticOutput;
  provenance: AiProvenance;
};

type DiagnosticErr = {
  kind: "error";
  message: string;
  code?: string;
  provenance: AiProvenance | null;
};

export function AiAdapterStatusPanel({
  initialStatus,
}: {
  initialStatus: AiAdapterStatus;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<DiagnosticOk | DiagnosticErr | null>(
    null,
  );

  async function refreshStatus() {
    const res = await fetch("/api/ai/status", { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Failed to load adapter status.");
    }
    const body = (await res.json()) as AiAdapterStatus;
    setStatus(body);
  }

  async function runDiagnostic() {
    setPending(true);
    setResult(null);
    try {
      await refreshStatus();
      const res = await fetch("/api/ai/diagnostic", {
        method: "POST",
        cache: "no-store",
      });
      const body = (await res.json()) as {
        output?: AdapterDiagnosticOutput;
        provenance?: AiProvenance;
        error?: string;
        code?: string;
      };

      if (!res.ok) {
        setResult({
          kind: "error",
          message: body.error ?? `Diagnostic failed (${res.status}).`,
          code: body.code,
          provenance: body.provenance ?? null,
        });
        return;
      }

      if (!body.output || !body.provenance) {
        setResult({
          kind: "error",
          message: "Diagnostic response missing output or provenance.",
          provenance: body.provenance ?? null,
        });
        return;
      }

      setResult({
        kind: "ok",
        output: body.output,
        provenance: body.provenance,
      });
    } catch (err) {
      setResult({
        kind: "error",
        message:
          err instanceof Error ? err.message : "Diagnostic request failed.",
        provenance: null,
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="mb-6 border-border/80">
      <CardHeader>
        <CardTitle className="text-lg">AI adapter status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          Infrastructure only — verifies Task → Runtime → Provider → validated
          result. Does not change recommendations, planning, mastery, history, or
          goals.
        </p>

        <dl className="grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Adapter version</dt>
            <dd className="font-medium">{status.adapterVersion}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Provider</dt>
            <dd className="font-medium">{status.providerId}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Model</dt>
            <dd className="font-medium">
              {status.configuredModel ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">API key configured</dt>
            <dd className="font-medium">
              {status.keyConfigured ? "Yes" : "No"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Live provider ready</dt>
            <dd className="font-medium">
              {status.liveProviderReady ? "Yes" : "No"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Timeout</dt>
            <dd className="font-medium">{status.timeoutMs} ms</dd>
          </div>
        </dl>

        <p className="text-xs text-muted-foreground">{status.note}</p>

        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => void runDiagnostic()}
        >
          {pending ? "Running diagnostic…" : "Run adapter diagnostic"}
        </Button>

        {result?.kind === "ok" ? (
          <div
            className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3"
            role="status"
          >
            <p className="font-medium text-emerald-800 dark:text-emerald-200">
              Diagnostic succeeded
            </p>
            <p className="mt-1 text-muted-foreground">{result.output.message}</p>
            <ProvenanceLines provenance={result.provenance} />
          </div>
        ) : null}

        {result?.kind === "error" ? (
          <div
            className="rounded-lg border border-destructive/40 bg-destructive/5 p-3"
            role="alert"
          >
            <p className="font-medium text-destructive">Diagnostic failed</p>
            <p className="mt-1 text-muted-foreground">{result.message}</p>
            {result.code ? (
              <p className="mt-1 text-xs text-muted-foreground">
                code: {result.code}
              </p>
            ) : null}
            {result.provenance ? (
              <ProvenanceLines provenance={result.provenance} />
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ProvenanceLines({ provenance }: { provenance: AiProvenance }) {
  return (
    <p className="mt-2 text-xs text-muted-foreground">
      {provenance.status} · {provenance.providerId}
      {provenance.model ? ` / ${provenance.model}` : ""} · prompt{" "}
      {provenance.promptId}@v{provenance.promptVersion} ·{" "}
      {provenance.latencyMs} ms · attempt {provenance.attemptCount} ·{" "}
      {provenance.invocationId.slice(0, 8)}…
    </p>
  );
}
