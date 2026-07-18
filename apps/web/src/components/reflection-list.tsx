import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Reflection } from "@/lib/reflection/reflection-types";

const STATUS_LABEL: Record<Reflection["status"], string> = {
  proposed: "Awaiting confirmation",
  confirmed: "Confirmed",
  declined: "Declined",
};

/** Read-only history of decided reflections (append-only signal). */
export function ReflectionList({
  reflections,
  skillNames,
}: {
  reflections: Reflection[];
  skillNames: Map<string, string>;
}) {
  if (reflections.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reflection history</CardTitle>
        <CardDescription>
          Every reflection is kept — confirmed and declined alike — as an
          immutable record of how your self-assessment evolved.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {reflections.map((reflection) => (
            <li
              key={reflection.id}
              className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  {skillNames.get(reflection.skillKey) ?? reflection.skillKey}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(reflection.createdAt).toLocaleDateString()} ·{" "}
                  {reflection.selfAssessment}
                </p>
              </div>
              <span className="shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {STATUS_LABEL[reflection.status]}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
