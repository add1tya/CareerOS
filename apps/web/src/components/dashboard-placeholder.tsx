import { ConstraintHoursEditor } from "@/components/constraint-hours-editor";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CareerGraph } from "@/lib/career-graph-service";

type DashboardPlaceholderProps = {
  displayName?: string;
  careerGraph: CareerGraph;
};

function formatDeadline(deadline: string | null): string {
  if (!deadline) return "No deadline set";
  const date = new Date(`${deadline}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function DashboardPlaceholder({
  displayName,
  careerGraph,
}: DashboardPlaceholderProps) {
  const { rootGoal, constraint } = careerGraph;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {displayName ? `Welcome, ${displayName}` : "Dashboard"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          What is the highest-value thing to do right now, and why?
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your goal</CardTitle>
            <CardDescription>
              The root of your Career Graph, from onboarding.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rootGoal ? (
              <div className="space-y-1">
                <p className="text-lg font-medium">{rootGoal.title}</p>
                <p className="text-sm text-muted-foreground">
                  Target: {formatDeadline(rootGoal.deadline)}
                </p>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Status: {rootGoal.status}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No goal yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your constraints</CardTitle>
            <CardDescription>
              Time you can commit each week.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {constraint ? (
              <div>
                <p className="text-lg font-medium">
                  {constraint.available_hours_per_week} hours / week
                </p>
                <ConstraintHoursEditor
                  currentHours={constraint.available_hours_per_week}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No constraints yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Career Graph initialized</CardTitle>
          <CardDescription>
            Your goal and constraints are stored. The Skill Graph and daily
            recommendation engine arrive in later milestones — nothing is
            generated for those yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Next: Skill Graph seeding, then the deterministic recommendation
            engine.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
