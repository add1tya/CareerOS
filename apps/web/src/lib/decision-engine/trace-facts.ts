/**
 * Trace Facts builder (ADR-0023).
 *
 * Decision Trace → Trace Facts (deterministic). No LLM. No ranking.
 */

import { createHash } from "node:crypto";

import {
  DECISION_EXPLANATION_VERSION,
  type DecisionExplanation,
} from "@/lib/decision-engine/explainability-types";
import {
  explanationFactsFromPersisted,
  parsePersistedDecisionFactors,
} from "@/lib/decision-engine/decision-explanation";
import type {
  TraceFactAtom,
  TraceFacts,
} from "@/lib/decision-engine/trace-narrator-types";

export function buildTraceFacts(args: {
  recommendationId: string;
  rawFactors: unknown;
  goalTitle: string | null;
  explanation: DecisionExplanation | null;
}): TraceFacts {
  const persisted = parsePersistedDecisionFactors(args.rawFactors);
  if (!persisted || !args.explanation) {
    return insufficient(
      args.recommendationId,
      "No usable persisted decision factors or structured explanation for this recommendation.",
    );
  }

  const explanationFacts = explanationFactsFromPersisted(
    persisted,
    args.goalTitle,
  );
  if (!explanationFacts) {
    return insufficient(
      args.recommendationId,
      "Could not project Explanation Facts from the persisted snapshot.",
    );
  }

  const atoms: TraceFactAtom[] = [];
  const push = (id: string, label: string, value: string) => {
    atoms.push({ id, label, value });
  };

  push("winner.skillKey", "Winner skill key", explanationFacts.winner.skillKey);
  push("winner.name", "Winner name", explanationFacts.winner.name);
  push(
    "confidence",
    "Decision confidence",
    explanationFacts.confidence,
  );

  if (explanationFacts.decidingFactorId) {
    push(
      "decidingFactorId",
      "Deciding factor id",
      explanationFacts.decidingFactorId,
    );
  }

  if (explanationFacts.runnerUp) {
    push(
      "runnerUp.skillKey",
      "Runner-up skill key",
      explanationFacts.runnerUp.skillKey,
    );
    push("runnerUp.name", "Runner-up name", explanationFacts.runnerUp.name);
  } else {
    push("runnerUp.absent", "Runner-up", "none in snapshot");
  }

  if (explanationFacts.goalTitle) {
    push("goalTitle", "Goal title", explanationFacts.goalTitle);
  } else {
    push("goalTitle.absent", "Goal title", "none provided");
  }

  for (const f of explanationFacts.winner.factors) {
    push(`winner.factor.${f.factorId}`, `Winner · ${f.label}`, f.display);
  }
  if (explanationFacts.runnerUp) {
    for (const f of explanationFacts.runnerUp.factors) {
      push(
        `runnerUp.factor.${f.factorId}`,
        `Runner-up · ${f.label}`,
        f.display,
      );
    }
  }

  push(
    "section.whyThisSkill",
    "Structured: why this skill",
    args.explanation.whyThisSkill,
  );
  push("section.whyNow", "Structured: why now", args.explanation.whyNow);
  push(
    "section.whyNotOther",
    "Structured: why not runner-up",
    args.explanation.whyNotOther,
  );
  push("section.ifSkipped", "Structured: if skipped", args.explanation.ifSkipped);
  push(
    "section.goalAlignment",
    "Structured: goal alignment",
    args.explanation.goalAlignment,
  );

  return {
    sufficient: true,
    insufficientReason: null,
    recommendationId: args.recommendationId,
    winnerSkillKey: explanationFacts.winner.skillKey,
    winnerName: explanationFacts.winner.name,
    runnerUpSkillKey: explanationFacts.runnerUp?.skillKey ?? null,
    runnerUpName: explanationFacts.runnerUp?.name ?? null,
    decidingFactorId: explanationFacts.decidingFactorId,
    confidence: explanationFacts.confidence,
    goalTitle: explanationFacts.goalTitle,
    decisionExplanationVersion:
      args.explanation.decisionExplanationVersion ?? DECISION_EXPLANATION_VERSION,
    atoms,
    sourceSections: {
      whyThisSkill: args.explanation.whyThisSkill,
      whyNow: args.explanation.whyNow,
      whyNotOther: args.explanation.whyNotOther,
      ifSkipped: args.explanation.ifSkipped,
      goalAlignment: args.explanation.goalAlignment,
    },
  };
}

export function hashTraceFacts(facts: TraceFacts): string {
  return createHash("sha256")
    .update(JSON.stringify(facts))
    .digest("hex");
}

function insufficient(
  recommendationId: string,
  reason: string,
): TraceFacts {
  return {
    sufficient: false,
    insufficientReason: reason,
    recommendationId,
    winnerSkillKey: null,
    winnerName: null,
    runnerUpSkillKey: null,
    runnerUpName: null,
    decidingFactorId: null,
    confidence: null,
    goalTitle: null,
    decisionExplanationVersion: null,
    atoms: [],
    sourceSections: null,
  };
}
