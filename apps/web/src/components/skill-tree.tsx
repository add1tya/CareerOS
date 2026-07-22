"use client";

/**
 * Skill Tree — INTERNAL inspection / debugging tool (Sprint 4 / M4).
 *
 * This is deliberately NOT a polished user-facing feature. It renders the
 * generated Skill Graph (global ontology + this user's overlay) so we can
 * eyeball that generation, dependencies, and status computation are correct.
 *
 * Layout is deterministic: tiers by ontology_category, ordered within a tier by
 * the ontology's display_order. Mastery and Confidence are shown as distinct
 * dimensions (product Principle 19), even here.
 *
 * Sprint 15: mastery self-report override lives here (skill-centric), not on
 * Reflection — correcting an estimate is Evidence on a skill (§5.5 / ADR-0012).
 */
import { useMemo } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  MasteryOverrideForm,
  type CorrectableSkill,
} from "@/components/mastery-override-form";
import type {
  OntologyCategory,
  SkillDomain,
  SkillGraph,
} from "@/lib/skill-graph/types";

const CATEGORY_TIERS: OntologyCategory[] = [
  "core",
  "advanced",
  "specialization",
  "future",
];

const DOMAIN_COLORS: Record<SkillDomain, string> = {
  programming_systems: "#2563eb",
  cs_theory: "#7c3aed",
  data_backend_infra: "#0891b2",
  math: "#dc2626",
  core_ml_dl: "#ea580c",
  llm_genai_systems: "#16a34a",
  evaluation_training_production: "#ca8a04",
  software_systems_engineering: "#4b5563",
  meta_skills: "#db2777",
};

const COLUMN_WIDTH = 210;
const ROW_HEIGHT = 150;

export function SkillTreeInspector({ graph }: { graph: SkillGraph }) {
  const { nodes, edges } = useMemo(() => {
    // Deterministic layout: one horizontal band per ontology_category, nodes
    // laid left-to-right by display_order within the band.
    const perTierIndex = new Map<OntologyCategory, number>();

    const sorted = [...graph.nodes].sort(
      (a, b) => a.display_order - b.display_order,
    );

    const flowNodes: Node[] = sorted.map((skill) => {
      const tier = CATEGORY_TIERS.indexOf(skill.ontology_category);
      const col = perTierIndex.get(skill.ontology_category) ?? 0;
      perTierIndex.set(skill.ontology_category, col + 1);

      const isLocked = skill.status === "locked";

      return {
        id: skill.skill_key,
        position: { x: col * COLUMN_WIDTH, y: tier * ROW_HEIGHT },
        data: {
          label: (
            <div style={{ textAlign: "left", lineHeight: 1.25 }}>
              <div style={{ fontWeight: 600 }}>{skill.name}</div>
              <div style={{ fontSize: 10, opacity: 0.85 }}>
                {skill.status} · {skill.source === "domain_advantage" ? "DA" : "—"}
              </div>
              <div style={{ fontSize: 10, opacity: 0.85 }}>
                Mastery {skill.mastery.toFixed(2)}
              </div>
              <div style={{ fontSize: 10, opacity: 0.85 }}>
                Confidence {skill.confidence.toFixed(2)}
              </div>
            </div>
          ),
        },
        style: {
          width: COLUMN_WIDTH - 30,
          fontSize: 11,
          borderRadius: 8,
          borderWidth: 2,
          borderStyle: isLocked ? "dashed" : "solid",
          borderColor: DOMAIN_COLORS[skill.domain],
          background: "#ffffff",
          color: "#111827",
          opacity: isLocked ? 0.6 : 1,
        },
      };
    });

    const flowEdges: Edge[] = graph.edges.map((dep) => ({
      id: `${dep.parent_skill_key}->${dep.child_skill_key}`,
      source: dep.parent_skill_key,
      target: dep.child_skill_key,
      style:
        dep.type === "soft"
          ? { strokeDasharray: "4 4", stroke: "#9ca3af" }
          : { stroke: "#9ca3af" },
    }));

    return { nodes: flowNodes, edges: flowEdges };
  }, [graph]);

  const correctableSkills: CorrectableSkill[] = useMemo(
    () =>
      [...graph.nodes]
        .filter((n) => n.status !== "locked")
        .sort((a, b) => a.display_order - b.display_order)
        .map((n) => ({
          skillKey: n.skill_key,
          name: n.name,
          mastery: n.mastery,
          confidence: n.confidence,
          status: n.status,
        })),
    [graph],
  );

  return (
    <section className="mt-6 space-y-2">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          Skill Graph (inspection)
        </h2>
        <p className="text-sm text-muted-foreground">
          Internal debugging view of the generated Skill Graph — {graph.nodes.length}{" "}
          skills, {graph.edges.length} dependencies. Solid border = available,
          dashed = locked. DA = domain-advantage provenance. Not a finished
          feature.
        </p>
        <p className="text-sm text-muted-foreground">
          Mastery and Confidence are distinct dimensions (Principle 19): Mastery
          is the estimated capability, Confidence is how verified that estimate
          is. Completing tasks records self-reported Evidence, so Confidence is
          capped at ~0.30 even as Mastery climbs — higher confidence needs
          higher-tier Evidence (deferred).
        </p>
      </div>
      <div
        className="rounded-lg border"
        style={{ height: 620 }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
        >
          <Background />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>

      <div className="rounded-lg border p-4">
        <h3 className="text-base font-semibold tracking-tight">
          Correct mastery estimate
        </h3>
        <div className="mt-3">
          <MasteryOverrideForm skills={correctableSkills} />
        </div>
      </div>
    </section>
  );
}
