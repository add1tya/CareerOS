import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type DashboardPlaceholderProps = {
  displayName?: string;
};

export function DashboardPlaceholder({
  displayName,
}: DashboardPlaceholderProps) {
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

      <Card>
        <CardHeader>
          <CardTitle>Onboarding complete</CardTitle>
          <CardDescription>
            Your answers are saved. Career Graph generation arrives in a later
            milestone — nothing is generated yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Next: Skill Graph seeding and the daily recommendation engine.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
