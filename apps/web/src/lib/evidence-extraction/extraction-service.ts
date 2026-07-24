/**
 * Evidence Extraction service (ADR-0022).
 *
 * Owns extraction sessions + proposal lifecycle. Never writes Evidence/Mastery
 * directly — confirm delegates to Evidence Service.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { AI_ADAPTER_VERSION } from "@/lib/ai/ai-adapter-types";
import { runAiTaskPersisted } from "@/lib/ai/ai-adapter-service";
import {
  buildEvidenceExtractInput,
  EVIDENCE_EXTRACT_PROMPT_ID,
  EVIDENCE_EXTRACT_PROMPT_VERSION,
  evidenceExtractTask,
} from "@/lib/ai/tasks/evidence-extract";
import { newCorrelationId } from "@/lib/history/history-service";
import { recordExtractionEvidence } from "@/lib/skill-graph/evidence/evidence-service";
import { getSkillGraph } from "@/lib/skill-graph/skill-graph-service";

import {
  EVIDENCE_EXTRACTION_VERSION,
  IMPLIED_MASTERY_CAPS,
  MAX_ARTIFACT_CHARS,
  type AcceptedProposalRef,
  type ExtractionSession,
  type ProposalFact,
} from "./extraction-types";
import { buildProposalFacts } from "./proposal-facts";
import {
  buildExtractionProposalView,
  type ExtractionProposalView,
} from "./proposal-view";

export type ExtractArtifactResult = {
  view: ExtractionProposalView;
  droppedCount: number;
};

export async function extractEvidenceFromArtifact(
  supabase: SupabaseClient,
  userId: string,
  artifactText: string,
  options?: { signal?: AbortSignal },
): Promise<ExtractArtifactResult> {
  if (artifactText.length === 0) {
    throw new Error("Artifact text is required.");
  }
  if (artifactText.length > MAX_ARTIFACT_CHARS) {
    throw new Error(
      `Artifact exceeds ${MAX_ARTIFACT_CHARS} characters. Shorten and retry.`,
    );
  }

  // Exact snapshot — never normalize / trim the stored artifact.
  const storedArtifact = artifactText;

  const skillGraph = await getSkillGraph(supabase, userId);
  const allowedKeys = skillGraph.nodes
    .filter((n) => n.status !== "locked")
    .map((n) => n.skill_key);
  const allowedSet = new Set(allowedKeys);
  const skillNames = new Map(
    skillGraph.nodes.map((n) => [n.skill_key, n.name]),
  );

  if (allowedKeys.length === 0) {
    throw new Error("No unlocked skills available for evidence proposals.");
  }

  const input = buildEvidenceExtractInput(storedArtifact, allowedKeys);
  const aiResult = await runAiTaskPersisted(
    supabase,
    userId,
    evidenceExtractTask,
    input,
    options,
  );

  const facts = buildProposalFacts(aiResult.output, allowedSet);

  const { data, error } = await supabase
    .from("evidence_extraction_sessions")
    .insert({
      user_id: userId,
      artifact_text: storedArtifact,
      artifact_byte_length: new TextEncoder().encode(storedArtifact).length,
      proposals: facts.proposals,
      status: "proposed",
      ai_invocation_id: aiResult.provenance.invocationId,
      extraction_version: EVIDENCE_EXTRACTION_VERSION,
      prompt_id: EVIDENCE_EXTRACT_PROMPT_ID,
      prompt_version: EVIDENCE_EXTRACT_PROMPT_VERSION,
      adapter_version: AI_ADAPTER_VERSION,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to store extraction session: ${error.message}`);
  }

  const session = mapSession(data);
  const view = buildExtractionProposalView({
    session,
    skillNames,
    overallNotes: facts.overallNotes,
  });

  return { view, droppedCount: facts.droppedCount };
}

export async function getExtractionView(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
): Promise<ExtractionProposalView> {
  const session = await loadSession(supabase, userId, sessionId);
  const skillGraph = await getSkillGraph(supabase, userId);
  const skillNames = new Map(
    skillGraph.nodes.map((n) => [n.skill_key, n.name]),
  );
  return buildExtractionProposalView({ session, skillNames });
}

export async function confirmExtraction(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
  accepted: AcceptedProposalRef[],
): Promise<void> {
  const session = await loadSession(supabase, userId, sessionId);
  if (session.status !== "proposed") {
    throw new Error("Extraction session is no longer proposed.");
  }
  if (accepted.length === 0) {
    throw new Error("Select at least one proposal to confirm, or decline.");
  }

  const byId = new Map(session.proposals.map((p) => [p.proposalId, p]));
  const resolved: Array<ProposalFact & { impliedMastery: number }> = [];

  for (const ref of accepted) {
    const fact = byId.get(ref.proposalId);
    if (!fact) {
      throw new Error(`Unknown proposal id: ${ref.proposalId}`);
    }
    const cap = IMPLIED_MASTERY_CAPS[fact.evidenceType];
    const mastery =
      ref.impliedMastery !== undefined
        ? clamp(ref.impliedMastery, 0, cap)
        : fact.impliedMastery;
    resolved.push({ ...fact, impliedMastery: mastery });
  }

  const correlationId = newCorrelationId();
  for (const proposal of resolved) {
    await recordExtractionEvidence(supabase, userId, {
      extractionId: session.id,
      proposalId: proposal.proposalId,
      skillKey: proposal.skillKey,
      evidenceType: proposal.evidenceType,
      impliedMastery: proposal.impliedMastery,
      correlationId,
    });
  }

  const { data, error } = await supabase
    .from("evidence_extraction_sessions")
    .update({
      status: "confirmed",
      accepted,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("user_id", userId)
    .eq("status", "proposed")
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to confirm extraction: ${error.message}`);
  }
  if (!data) {
    throw new Error("Extraction session is no longer proposed.");
  }
}

export async function declineExtraction(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("evidence_extraction_sessions")
    .update({
      status: "declined",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("user_id", userId)
    .eq("status", "proposed")
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to decline extraction: ${error.message}`);
  }
  if (!data) {
    throw new Error("Extraction session is no longer proposed.");
  }
}

export async function listExtractionSessions(
  supabase: SupabaseClient,
  userId: string,
): Promise<ExtractionSession[]> {
  const { data, error } = await supabase
    .from("evidence_extraction_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(`Failed to list extractions: ${error.message}`);
  }
  return (data ?? []).map(mapSession);
}

async function loadSession(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
): Promise<ExtractionSession> {
  const { data, error } = await supabase
    .from("evidence_extraction_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load extraction: ${error.message}`);
  }
  if (!data) {
    throw new Error("Extraction session not found.");
  }
  return mapSession(data);
}

function mapSession(row: Record<string, unknown>): ExtractionSession {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    artifactText: row.artifact_text as string,
    artifactByteLength: row.artifact_byte_length as number,
    proposals: (row.proposals as ProposalFact[]) ?? [],
    accepted: (row.accepted as AcceptedProposalRef[] | null) ?? null,
    status: row.status as ExtractionSession["status"],
    aiInvocationId: (row.ai_invocation_id as string | null) ?? null,
    extractionVersion: row.extraction_version as number,
    promptId: row.prompt_id as string,
    promptVersion: row.prompt_version as number,
    adapterVersion: row.adapter_version as number,
    createdAt: row.created_at as string,
    resolvedAt: (row.resolved_at as string | null) ?? null,
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
