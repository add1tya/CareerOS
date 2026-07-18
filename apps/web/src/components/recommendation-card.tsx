import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
}: {
  recommendation: SkillRecommendation | null;
}) {
  if (!recommendation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>What should I learn next?</CardTitle>
          <CardDescription>
            No skill is available to recommend yet. Once prerequisites are met,
            your next-best skill will appear here.
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
      <CardContent className="space-y-2">
        <p className="text-sm text-foreground">{recommendation.narrative}</p>
        <p className="text-xs text-muted-foreground">
          Determined from prerequisite structure and skill tier. It stays fixed
          on the skill you are working as you record progress, and updates once a
          skill is fully mastered — it is not yet weighted by mastery level.
        </p>
      </CardContent>
    </Card>
  );
}
