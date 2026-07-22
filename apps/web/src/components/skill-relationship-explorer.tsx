"use client";

/**
 * Skill Relationship Explorer (Sprint 21 / M21) — founder-facing 1-hop view.
 *
 * Projection over Skill Graph; Roadmap is optional context. Does not edit the
 * graph or influence planning (ADR-0018). SkillTreeInspector remains the
 * engineering canvas.
 */
import { useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { buildSkillRelationshipView } from "@/lib/skill-graph/skill-relationship-view";
import type { RelatedSkillFact } from "@/lib/skill-graph/skill-relationship-types";
import type { SkillGraph } from "@/lib/skill-graph/types";
import type { Roadmap } from "@/lib/planning/roadmap-types";

const selectClassName =
  "border-input bg-background h-9 w-full rounded-lg border px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function RelatedList({
  title,
  items,
}: {
  title: string;
  items: RelatedSkillFact[];
}) {
  return (
    <div>
      <p className="text-sm font-medium">{title}</p>
      {items.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">None recorded.</p>
      ) : (
        <ul className="mt-1 space-y-1.5 text-sm text-muted-foreground">
          {items.map((r) => (
            <li key={`${r.role}-${r.dependencyType}-${r.skillKey}`}>
              <span className="font-medium text-foreground">{r.name}</span>
              {" · "}
              {r.dependencyType} · min mastery {r.minimumMastery.toFixed(2)} ·
              status {r.status} · mastery {r.mastery.toFixed(2)} / confidence{" "}
              {r.confidence.toFixed(2)}
              <span className="block text-[11px]">
                {r.role === "prerequisite"
                  ? `${r.skillKey} → focus`
                  : `focus → ${r.skillKey}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SkillRelationshipExplorer({
  graph,
  roadmap = null,
  initialSkillKey,
}: {
  graph: SkillGraph;
  roadmap?: Roadmap | null;
  initialSkillKey?: string | null;
}) {
  const options = useMemo(
    () =>
      [...graph.nodes].sort(
        (a, b) =>
          a.display_order - b.display_order ||
          a.skill_key.localeCompare(b.skill_key),
      ),
    [graph],
  );

  const fallbackKey =
    initialSkillKey && options.some((n) => n.skill_key === initialSkillKey)
      ? initialSkillKey
      : (options.find((n) => n.status !== "locked")?.skill_key ??
        options[0]?.skill_key ??
        "");

  const [skillKey, setSkillKey] = useState(fallbackKey);

  const view = useMemo(
    () =>
      skillKey
        ? buildSkillRelationshipView({ skillKey, graph, roadmap })
        : null,
    [skillKey, graph, roadmap],
  );

  if (options.length === 0) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Skill relationships</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No skills in the Skill Graph yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-lg">Skill relationships</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          Direct (1-hop) prerequisites and unlocks from the Skill Graph.
          Relationships are not inferred. Roadmap participation is optional
          context only. Explorer policy v
          {view?.skillRelationshipExplorerVersion ?? "—"}.
        </p>

        <div className="space-y-2">
          <Label htmlFor="skill_relationship_focus">Focus skill</Label>
          <select
            id="skill_relationship_focus"
            className={selectClassName}
            value={skillKey}
            onChange={(e) => setSkillKey(e.target.value)}
          >
            {options.map((n) => (
              <option key={n.skill_key} value={n.skill_key}>
                {n.name} ({n.status})
              </option>
            ))}
          </select>
        </div>

        {view ? (
          <>
            <div>
              <p className="font-medium">Focus</p>
              <p className="mt-1 text-muted-foreground">{view.focusSummary}</p>
            </div>

            <RelatedList
              title="Hard prerequisites"
              items={view.hardPrerequisites}
            />
            <RelatedList
              title="Soft prerequisites"
              items={view.softPrerequisites}
            />
            <RelatedList title="Hard unlocks" items={view.hardUnlocks} />
            <RelatedList title="Soft unlocks" items={view.softUnlocks} />

            <div>
              <p className="font-medium">Neighborhood</p>
              <p className="mt-1 text-muted-foreground">
                {view.neighborhoodSection}
              </p>
            </div>

            <div>
              <p className="font-medium">Roadmap context</p>
              <p className="mt-1 text-muted-foreground">{view.roadmapSection}</p>
            </div>

            <div>
              <p className="font-medium">Why it sits here (recorded facts)</p>
              <p className="mt-1 text-muted-foreground">{view.whyHereSection}</p>
            </div>
          </>
        ) : (
          <p className="text-muted-foreground">Select a skill to inspect.</p>
        )}
      </CardContent>
    </Card>
  );
}
