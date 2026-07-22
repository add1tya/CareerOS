import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OverrideRecommendationForm } from "@/components/override-forms";
import { RecommendationExplanation } from "@/components/recommendation-explanation";
import type { DecisionExplanation } from "@/lib/decision-engine/explainability-types";
import type {
  RecommendationConfidence,
  SkillRecommendation,
} from "@/lib/decision-engine/types";

const CONFIDENCE_LABEL: Record<RecommendationConfidence, string> = {
  LOW: "Low confidence",
  MEDIUM: "Medium confidence",
  HIGH: "High confidence",
  VERY_HIGH: "Very high confidence",
};

function ConfidenceBadge({ confidence }: { confidence: RecommendationConfidence }) {
  return (
    <span className="rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
      {CONFIDENCE_LABEL[confidence]}
    </span>
  );
}

export function RecommendationCard({
  recommendation,
  explanation,
}: {
  recommendation: SkillRecommendation | null;
  explanation: DecisionExplanation | null;
}) {
  if (!recommendation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>What should I learn next?</CardTitle>
          <CardDescription>
            No skill is available to recommend yet. Once prerequisites are met
            (and none are suppressed by an override), your next-best skill will
            appear here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardDescription>Your highest-value next skill</CardDescription>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-2xl">{recommendation.skillName}</CardTitle>
          <ConfidenceBadge confidence={recommendation.confidence} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-foreground">{recommendation.narrative}</p>
        <RecommendationExplanation explanation={explanation} />
        <p className="text-xs text-muted-foreground">
          Ranking is unchanged by this explanation. Overrides are signal, not
          errors — rejecting a skill excludes it from eligibility until new
          Evidence on that skill is recorded.
        </p>
        <OverrideRecommendationForm recommendationId={recommendation.id} />
      </CardContent>
    </Card>
  );
}
