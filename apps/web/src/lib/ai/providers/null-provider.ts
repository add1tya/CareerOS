/**
 * NullProvider — offline / CI / no-key path (ADR-0020).
 * Returns fixture JSON for diagnostic, extract, narrate, and resume.compose.
 */

import { AI_ADAPTER_VERSION, AiCancelledError } from "@/lib/ai/ai-adapter-types";
import {
  STRUCTURED_COMPLETION_ONLY,
  type AiProvider,
  type AiProviderCapability,
  type ProviderRawResponse,
  type ProviderStructuredRequest,
} from "@/lib/ai/providers/types";

export class NullProvider implements AiProvider {
  readonly id = "null";
  readonly displayName = "Null (offline)";
  readonly capabilities: ReadonlySet<AiProviderCapability> =
    STRUCTURED_COMPLETION_ONLY;

  async completeStructured(
    request: ProviderStructuredRequest,
  ): Promise<ProviderRawResponse> {
    if (request.signal.aborted) {
      throw new AiCancelledError("NullProvider aborted before start.");
    }

    // Offline fixture for evidence.extract (ADR-0022) — empty proposals.
    if (
      request.user.includes("allowed_skill_keys_json") ||
      request.user.includes("Evidence Extraction Assistant")
    ) {
      return {
        text: JSON.stringify({
          proposals: [],
          overallNotes:
            "NullProvider: no live model. Configure AI_PROVIDER=gemini|anthropic to extract proposals.",
        }),
        model: "null-fixture",
      };
    }

    // Offline fixture for portfolio.compose (ADR-0028) — grounded canned sections.
    if (
      request.user.includes("Portfolio Intelligence") ||
      request.user.includes("Portfolio Facts JSON:")
    ) {
      return {
        text: JSON.stringify(buildNullPortfolioCompose(request.user)),
        model: "null-fixture",
      };
    }

    // Offline fixture for career.gap_analysis (ADR-0025) — grounded canned sections.
    if (
      request.user.includes("Career Gap Analysis") ||
      request.user.includes("Gap Facts JSON:")
    ) {
      return {
        text: JSON.stringify(buildNullGapAnalysis(request.user)),
        model: "null-fixture",
      };
    }

    // Offline fixture for resume.compose (ADR-0024) — grounded canned sections.
    if (
      request.user.includes("Resume Intelligence") ||
      request.user.includes("Resume Facts JSON:")
    ) {
      return {
        text: JSON.stringify(buildNullResumeCompose(request.user)),
        model: "null-fixture",
      };
    }

    // Offline fixture for trace.narrate (ADR-0023) — grounded canned prose.
    if (
      request.user.includes("Decision Trace Narrator") ||
      request.user.includes("trace_facts_json")
    ) {
      let citationIds = [
        "winner.name",
        "section.whyThisSkill",
        "section.whyNow",
        "section.whyNotOther",
        "section.ifSkipped",
        "section.goalAlignment",
      ];
      try {
        const match = /Trace Facts JSON:\s*(\{[\s\S]*\})\s*$/m.exec(
          request.user,
        );
        if (match?.[1]) {
          const parsed = JSON.parse(match[1]) as {
            atoms?: Array<{ id: string }>;
          };
          const ids = (parsed.atoms ?? []).map((a) => a.id);
          if (ids.length > 0) {
            citationIds = [
              ids.find((id) => id === "winner.name") ?? ids[0]!,
              ids.find((id) => id === "section.whyThisSkill") ?? ids[0]!,
              ids.find((id) => id === "section.whyNow") ?? ids[0]!,
              ids.find((id) => id === "section.whyNotOther") ?? ids[0]!,
              ids.find((id) => id === "section.ifSkipped") ?? ids[0]!,
              ids.find((id) => id === "section.goalAlignment") ?? ids[0]!,
            ];
          }
        }
      } catch {
        // keep defaults
      }

      return {
        text: JSON.stringify({
          sections: [
            {
              key: "overview",
              prose:
                "NullProvider narrative: this recommendation was selected by the deterministic Decision Engine. Live AI wording requires a configured provider.",
              citationIds: [citationIds[0]!],
            },
            {
              key: "whyThisSkill",
              prose:
                "The structured snapshot lists the winner’s factor values; see the facts panel for exact numbers.",
              citationIds: [citationIds[1]!],
            },
            {
              key: "whyNow",
              prose:
                "Eligibility at record time placed this skill in the candidate pool.",
              citationIds: [citationIds[2]!],
            },
            {
              key: "whyNotRunnerUp",
              prose:
                "Comparison with the runner-up follows the deciding factor in the snapshot, when present.",
              citationIds: [citationIds[3]!],
            },
            {
              key: "ifSkipped",
              prose:
                "Skipping or overriding does not rewrite the stored factor snapshot.",
              citationIds: [citationIds[4]!],
            },
            {
              key: "goalAlignment",
              prose:
                "Goal alignment text is taken from the structured explanation atoms.",
              citationIds: [citationIds[5]!],
            },
          ],
          uncertaintyNote:
            "Generated by NullProvider (offline). Not a live model narrative.",
        }),
        model: "null-fixture",
      };
    }

    const payload = {
      ok: true as const,
      message: "NullProvider diagnostic OK — no live model called.",
      adapterVersion: AI_ADAPTER_VERSION,
    };

    return {
      text: JSON.stringify(payload),
      model: "null-fixture",
    };
  }
}

function buildNullResumeCompose(userPrompt: string): {
  sections: Array<{
    key: string;
    items: Array<{ text: string; citationIds: string[] }>;
  }>;
} {
  type Plan = {
    key: string;
    status: string;
    atomIds: string[];
  };
  let plans: Plan[] = [];
  try {
    const sectionsMatch = /Resume Sections JSON:\s*(\{[\s\S]*\})\s*$/m.exec(
      userPrompt,
    );
    if (sectionsMatch?.[1]) {
      const parsed = JSON.parse(sectionsMatch[1]) as { sections?: Plan[] };
      plans = parsed.sections ?? [];
    }
  } catch {
    // keep empty — fallback below
  }

  const include = plans.filter(
    (p) => p.status === "include" && p.atomIds.length > 0,
  );
  if (include.length === 0) {
    return {
      sections: [
        {
          key: "summary",
          items: [
            {
              text: "NullProvider resume draft — configure a live AI provider for composed prose.",
              citationIds: ["profile.display_name"],
            },
          ],
        },
      ],
    };
  }

  return {
    sections: include.map((plan) => ({
      key: plan.key,
      items: [
        {
          text: `NullProvider (${plan.key}): grounded from CareerOS facts. Live AI wording requires a configured provider.`,
          citationIds: [plan.atomIds[0]!],
        },
      ],
    })),
  };
}

function buildNullGapAnalysis(userPrompt: string): {
  sections: Array<{ key: string; prose: string; citationIds: string[] }>;
  uncertaintyNote: string;
} {
  type Plan = {
    key: string;
    status: string;
    atomIds: string[];
  };
  let plans: Plan[] = [];
  try {
    const sectionsMatch = /Gap Sections JSON:\s*(\{[\s\S]*\})\s*$/m.exec(
      userPrompt,
    );
    if (sectionsMatch?.[1]) {
      const parsed = JSON.parse(sectionsMatch[1]) as { sections?: Plan[] };
      plans = parsed.sections ?? [];
    }
  } catch {
    // keep empty
  }

  const include = plans.filter(
    (p) => p.status === "include" && p.atomIds.length > 0,
  );
  if (include.length === 0) {
    return {
      sections: [
        {
          key: "overview",
          prose:
            "NullProvider gap analysis — configure a live AI provider for narrated prose.",
          citationIds: ["limits.present_tense"],
        },
      ],
      uncertaintyNote: "Generated by NullProvider (offline).",
    };
  }

  return {
    sections: include.map((plan) => ({
      key: plan.key,
      prose: `NullProvider (${plan.key}): current CareerOS facts only. Live AI wording requires a configured provider.`,
      citationIds: [plan.atomIds[0]!],
    })),
    uncertaintyNote: "Generated by NullProvider (offline).",
  };
}

function buildNullPortfolioCompose(userPrompt: string): {
  sections: Array<{
    key: string;
    items: Array<{
      text: string;
      citationIds: string[];
      stableId: string | null;
    }>;
  }>;
} {
  type Plan = {
    key: string;
    status: string;
    atomIds: string[];
  };
  let plans: Plan[] = [];
  try {
    const sectionsMatch = /Portfolio Sections JSON:\s*(\{[\s\S]*\})\s*$/m.exec(
      userPrompt,
    );
    if (sectionsMatch?.[1]) {
      const parsed = JSON.parse(sectionsMatch[1]) as { sections?: Plan[] };
      plans = parsed.sections ?? [];
    }
  } catch {
    // keep empty
  }

  const include = plans.filter(
    (p) => p.status === "include" && p.atomIds.length > 0,
  );
  const orderedKeys = new Set(["featuredProjects", "learningJourney"]);

  if (include.length === 0) {
    return {
      sections: [
        {
          key: "about",
          items: [
            {
              text: "NullProvider portfolio — configure a live AI provider for composed prose.",
              citationIds: ["profile.display_name"],
              stableId: null,
            },
          ],
        },
      ],
    };
  }

  return {
    sections: include.map((plan) => {
      if (orderedKeys.has(plan.key)) {
        return {
          key: plan.key,
          items: plan.atomIds.map((id) => ({
            text: `NullProvider (${plan.key}): grounded entry for ${id}. Live AI wording requires a configured provider.`,
            citationIds: [id],
            stableId: id,
          })),
        };
      }
      return {
        key: plan.key,
        items: [
          {
            text: `NullProvider (${plan.key}): grounded from CareerOS facts. Live AI wording requires a configured provider.`,
            citationIds: [plan.atomIds[0]!],
            stableId: null,
          },
        ],
      };
    }),
  };
}
