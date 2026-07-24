/**
 * Built-in Capability Manifests (ADR-0027).
 *
 * Version constants only from product modules — never import execution services.
 */

import { CAPABILITY_MANIFEST_SCHEMA_VERSION } from "@/lib/capabilities/capability-manifest-types";
import type { CapabilityManifest } from "@/lib/capabilities/capability-manifest-types";
import { EVIDENCE_EXTRACTION_VERSION } from "@/lib/evidence-extraction/extraction-types";
import { TRACE_NARRATOR_VERSION } from "@/lib/decision-engine/trace-narrator-types";
import { RESUME_INTELLIGENCE_VERSION } from "@/lib/resume-intelligence/resume-intelligence-types";
import { GAP_ANALYSIS_VERSION } from "@/lib/gap-analysis/gap-analysis-types";
import { PORTFOLIO_INTELLIGENCE_VERSION } from "@/lib/portfolio-intelligence/portfolio-intelligence-types";

const SCHEMA = CAPABILITY_MANIFEST_SCHEMA_VERSION;

/**
 * Built-ins in intentional authoring order. Registry list() re-sorts by id.
 */
export const BUILTIN_CAPABILITY_MANIFESTS: CapabilityManifest[] = [
  {
    id: "evidence.extract",
    displayName: "Evidence Extraction",
    description:
      "Propose structured Evidence candidates from an unstructured learning artifact. Confirmation remains on the Evidence UI.",
    category: "ai_projection",
    kind: "ai_adapter_consumer",
    mutability: "confirmation_gated",
    capabilityVersion: EVIDENCE_EXTRACTION_VERSION,
    manifestVersion: SCHEMA,
    adapterTaskType: "evidence.extract",
    requiredSlots: [
      {
        name: "artifactText",
        type: "text",
        required: true,
        description: "Unstructured artifact text to extract from.",
      },
    ],
    dependsOn: [],
    outputRef: "Extraction session with Proposal Facts (confirm separately)",
    deepLinkPath: "/evidence/extract",
    tags: ["evidence", "extraction"],
    status: "active",
    orchestratorInvokable: true,
  },
  {
    id: "trace.narrate",
    displayName: "Decision Trace Narrator",
    description:
      "Narrate a persisted Decision Trace into grounded prose. Does not re-rank or change recommendations.",
    category: "ai_projection",
    kind: "ai_adapter_consumer",
    mutability: "read_only",
    capabilityVersion: TRACE_NARRATOR_VERSION,
    manifestVersion: SCHEMA,
    adapterTaskType: "trace.narrate",
    requiredSlots: [
      {
        name: "recommendationId",
        type: "uuid",
        required: true,
        description: "skill_recommendations row id to narrate.",
      },
    ],
    dependsOn: [],
    outputRef: "Immutable decision_trace_narratives snapshot",
    deepLinkPath: "/dashboard",
    tags: ["decision", "explainability", "narrative"],
    status: "active",
    orchestratorInvokable: true,
  },
  {
    id: "resume.compose",
    displayName: "Resume Intelligence",
    description:
      "Compose resume-ready prose from Resume Facts. Distinct from Export; never invents employers or credentials.",
    category: "ai_projection",
    kind: "ai_adapter_consumer",
    mutability: "read_only",
    capabilityVersion: RESUME_INTELLIGENCE_VERSION,
    manifestVersion: SCHEMA,
    adapterTaskType: "resume.compose",
    requiredSlots: [],
    dependsOn: [],
    outputRef: "Immutable resume_drafts snapshot",
    deepLinkPath: "/resume",
    tags: ["resume", "prose"],
    status: "active",
    orchestratorInvokable: true,
  },
  {
    id: "career.gap_analysis",
    displayName: "Career Gap Analysis",
    description:
      "Summarize verified strengths, missing evidence, and weak mastery from Gap Facts. Present-tense only; never plans.",
    category: "ai_projection",
    kind: "ai_adapter_consumer",
    mutability: "read_only",
    capabilityVersion: GAP_ANALYSIS_VERSION,
    manifestVersion: SCHEMA,
    adapterTaskType: "career.gap_analysis",
    requiredSlots: [],
    dependsOn: [],
    outputRef: "Immutable career_gap_reports snapshot",
    deepLinkPath: "/gap-analysis",
    tags: ["gaps", "analysis"],
    status: "active",
    orchestratorInvokable: true,
  },
  {
    id: "portfolio.compose",
    displayName: "Portfolio Intelligence",
    description:
      "Compose a proof-oriented technical portfolio from Portfolio Facts. Distinct from Resume; content only — not websites or publishing.",
    category: "ai_projection",
    kind: "ai_adapter_consumer",
    mutability: "read_only",
    capabilityVersion: PORTFOLIO_INTELLIGENCE_VERSION,
    manifestVersion: SCHEMA,
    adapterTaskType: "portfolio.compose",
    requiredSlots: [],
    dependsOn: [],
    outputRef: "Immutable portfolio_drafts snapshot",
    deepLinkPath: "/portfolio",
    tags: ["portfolio", "prose", "proof"],
    status: "active",
    orchestratorInvokable: true,
  },
];
