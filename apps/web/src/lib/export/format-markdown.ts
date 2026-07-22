/**
 * Markdown export formatter (Sprint 11 / M11) — PURE.
 *
 * Transforms an already-assembled CareerOsExport into human-readable Markdown.
 * No database access. Section order follows EXPORT_SECTION_ORDER (ADR-0008).
 */
import {
  EXPORT_SECTION_ORDER,
  type CareerOsExport,
} from "@/lib/export/export-types";

export function formatExportMarkdown(doc: CareerOsExport): string {
  const parts: string[] = [
    "# CareerOS Data Export",
    "",
    "_Plain, human-readable export of your CareerOS data (Guiding Principle 27)._",
    "",
  ];

  for (const section of EXPORT_SECTION_ORDER) {
    switch (section) {
      case "metadata":
        parts.push(...renderMetadata(doc));
        break;
      case "profile":
        parts.push(...renderProfile(doc));
        break;
      case "career_graph":
        parts.push(...renderCareerGraph(doc));
        break;
      case "skill_graph":
        parts.push(...renderSkillGraph(doc));
        break;
      case "execution":
        parts.push(...renderExecution(doc));
        break;
      case "evidence":
        parts.push(...renderEvidence(doc));
        break;
      case "reflection":
        parts.push(...renderReflection(doc));
        break;
      case "overrides":
        parts.push(...renderOverrides(doc));
        break;
      case "history":
        parts.push(...renderHistory(doc));
        break;
      case "computed_snapshots":
        parts.push(...renderComputed(doc));
        break;
    }
  }

  return parts.join("\n");
}

function renderMetadata(doc: CareerOsExport): string[] {
  const m = doc.metadata;
  return [
    "## Metadata",
    "",
    `| Field | Value |`,
    `| --- | --- |`,
    `| export_schema_version | ${m.export_schema_version} |`,
    `| generated_at | ${m.generated_at} |`,
    `| user_id | ${m.user_id} |`,
    `| planning_engine_version | ${m.planning_engine_version} |`,
    `| mastery_policy_version | ${m.mastery_policy_version} |`,
    `| reflection_engine_version | ${m.reflection_engine_version} |`,
    `| history_schema_version | ${m.history_schema_version} |`,
    "",
  ];
}

function renderProfile(doc: CareerOsExport): string[] {
  const p = doc.profile;
  return [
    "## Profile",
    "",
    `| Field | Value |`,
    `| --- | --- |`,
    `| display_name | ${escapeCell(p.display_name)} |`,
    `| current_profession | ${escapeCell(p.current_profession)} |`,
    `| target_role | ${escapeCell(p.target_role)} |`,
    `| timeline_months | ${p.timeline_months} |`,
    `| available_hours_per_week | ${p.available_hours_per_week} |`,
    `| onboarding_completed_at | ${p.onboarding_completed_at ?? "—"} |`,
    `| career_graph_initialized_at | ${p.career_graph_initialized_at ?? "—"} |`,
    `| skill_graph_generated_at | ${p.skill_graph_generated_at ?? "—"} |`,
    `| created_with_version | ${p.created_with_version} |`,
    `| created_at | ${p.created_at} |`,
    `| updated_at | ${p.updated_at} |`,
    "",
  ];
}

function renderCareerGraph(doc: CareerOsExport): string[] {
  const lines: string[] = ["## Career Graph", "", "### Goals", ""];
  if (doc.career_graph.goals.length === 0) {
    lines.push("_No goals persisted._", "");
  } else {
    for (const goal of doc.career_graph.goals) {
      lines.push(
        `- **${escapeCell(goal.title)}** (\`${goal.id}\`) — status: ${goal.status}, deadline: ${goal.deadline ?? "—"}, source: ${goal.source}`,
      );
    }
    lines.push("");
  }

  lines.push("### Constraints", "");
  if (!doc.career_graph.constraint) {
    lines.push("_No constraints row persisted._", "");
  } else {
    const c = doc.career_graph.constraint;
    lines.push(
      `| Field | Value |`,
      `| --- | --- |`,
      `| available_hours_per_week | ${c.available_hours_per_week} |`,
      `| last_confirmed_at | ${c.last_confirmed_at ?? "—"} |`,
      `| created_at | ${c.created_at} |`,
      `| updated_at | ${c.updated_at} |`,
      "",
    );
  }
  return lines;
}

function renderSkillGraph(doc: CareerOsExport): string[] {
  const lines: string[] = [
    "## Skill Graph",
    "",
    "_User overlay joined with skill metadata needed for legibility. Not a dump of unrelated ontology catalog rows beyond the user's graph._",
    "",
    `### Nodes (${doc.skill_graph.nodes.length})`,
    "",
  ];

  if (doc.skill_graph.nodes.length === 0) {
    lines.push("_No skill nodes._", "");
  } else {
    lines.push(
      `| skill_key | name | status | mastery | confidence | category |`,
      `| --- | --- | --- | --- | --- | --- |`,
    );
    for (const node of doc.skill_graph.nodes) {
      lines.push(
        `| ${node.skill_key} | ${escapeCell(node.name)} | ${node.status} | ${node.mastery} | ${node.confidence} | ${node.ontology_category} |`,
      );
    }
    lines.push("");
  }

  lines.push(
    `### Dependencies (${doc.skill_graph.dependencies.length})`,
    "",
  );
  if (doc.skill_graph.dependencies.length === 0) {
    lines.push("_No dependencies._", "");
  } else {
    lines.push(
      `| parent | child | type | minimum_mastery |`,
      `| --- | --- | --- | --- |`,
    );
    for (const dep of doc.skill_graph.dependencies) {
      lines.push(
        `| ${dep.parent_skill_key} | ${dep.child_skill_key} | ${dep.type} | ${dep.minimum_mastery} |`,
      );
    }
    lines.push("");
  }
  return lines;
}

function renderExecution(doc: CareerOsExport): string[] {
  const lines: string[] = ["## Execution", ""];

  lines.push(
    `### Recommendations (${doc.execution.recommendations.length})`,
    "",
  );
  if (doc.execution.recommendations.length === 0) {
    lines.push("_None._", "");
  } else {
    for (const rec of doc.execution.recommendations) {
      lines.push(
        `- \`${rec.id}\` → **${rec.recommended_skill_key}** (${rec.confidence}) at ${rec.generated_at}`,
        `  - ${escapeCell(rec.narrative)}`,
      );
    }
    lines.push("");
  }

  lines.push(`### Missions (${doc.execution.missions.length})`, "");
  if (doc.execution.missions.length === 0) {
    lines.push("_None._", "");
  } else {
    for (const m of doc.execution.missions) {
      lines.push(
        `- \`${m.id}\` **${escapeCell(m.title)}** — skill ${m.generated_from_skill_key}, status ${m.status}, template v${m.template_version}`,
      );
    }
    lines.push("");
  }

  lines.push(`### Quests (${doc.execution.quests.length})`, "");
  if (doc.execution.quests.length === 0) {
    lines.push("_None._", "");
  } else {
    for (const q of doc.execution.quests) {
      lines.push(
        `- \`${q.id}\` mission=\`${q.mission_id}\` **${escapeCell(q.title)}** — status ${q.status}, order ${q.order_index}`,
      );
    }
    lines.push("");
  }

  lines.push(`### Tasks (${doc.execution.tasks.length})`, "");
  if (doc.execution.tasks.length === 0) {
    lines.push("_None._", "");
  } else {
    for (const t of doc.execution.tasks) {
      lines.push(
        `- \`${t.id}\` quest=\`${t.quest_id}\` **${escapeCell(t.title)}** — ${t.status}, ${t.estimated_minutes}m, skill ${t.generated_from_skill_key}`,
      );
    }
    lines.push("");
  }

  return lines;
}

function renderEvidence(doc: CareerOsExport): string[] {
  const lines: string[] = [
    "## Evidence",
    "",
    `### Records (${doc.evidence.records.length})`,
    "",
  ];
  if (doc.evidence.records.length === 0) {
    lines.push("_No evidence records._", "");
    return lines;
  }
  lines.push(
    `| id | skill_key | type | tier | implied_mastery | recorded_at |`,
    `| --- | --- | --- | --- | --- | --- |`,
  );
  for (const e of doc.evidence.records) {
    lines.push(
      `| ${e.id} | ${e.skill_key} | ${e.type} | ${e.tier} | ${e.implied_mastery} | ${e.recorded_at} |`,
    );
  }
  lines.push("");
  return lines;
}

function renderReflection(doc: CareerOsExport): string[] {
  const lines: string[] = [
    "## Reflection",
    "",
    `### Reflections (${doc.reflection.reflections.length})`,
    "",
  ];
  if (doc.reflection.reflections.length === 0) {
    lines.push("_No reflections._", "");
    return lines;
  }
  for (const r of doc.reflection.reflections) {
    lines.push(
      `- \`${r.id}\` skill **${r.skillKey}** — ${r.status}, assessment: ${r.selfAssessment}, created ${r.createdAt}`,
    );
  }
  lines.push("");
  return lines;
}

function renderOverrides(doc: CareerOsExport): string[] {
  const lines: string[] = [
    "## Overrides",
    "",
    "_Append-only user intent (Principle 18). Suppression is derived, not stored._",
    "",
    `### Records (${doc.overrides.records.length})`,
    "",
  ];
  if (doc.overrides.records.length === 0) {
    lines.push("_No overrides._", "");
    return lines;
  }
  for (const o of doc.overrides.records) {
    lines.push(
      `- \`${o.id}\` **${o.kind}** skill ${o.skillKey} — ${o.reasonCode} at ${o.createdAt}`,
    );
  }
  lines.push("");
  return lines;
}

function renderHistory(doc: CareerOsExport): string[] {
  const lines: string[] = [
    "## History",
    "",
    "_Append-only audit index (references domain objects; payload is convenience only). Ordered occurred_at DESC, id DESC._",
    "",
    `### Events (${doc.history.events.length})`,
    "",
  ];
  if (doc.history.events.length === 0) {
    lines.push(
      "_No history events. Pre–Sprint-10 activity is not backfilled._",
      "",
    );
    return lines;
  }
  for (const e of doc.history.events) {
    lines.push(
      `- ${e.occurredAt} **${e.eventType}** actor=${e.actor} ${e.entityKind}:\`${e.entityId}\` corr:\`${e.correlationId}\``,
    );
  }
  lines.push("");
  return lines;
}

function renderComputed(doc: CareerOsExport): string[] {
  const snap = doc.computed_snapshots.roadmap;
  const lines: string[] = [
    "## Computed Snapshots",
    "",
    "### Roadmap",
    "",
    `> **computed: true** — ${snap.note}`,
    "",
    `planning_engine_version (on snapshot): ${snap.snapshot.planningEngineVersion}`,
    `goal: ${snap.snapshot.goalTitle ?? "—"}`,
    `current_step_id: ${snap.snapshot.currentStepId ?? "—"}`,
    `remaining_hours: ${snap.snapshot.remainingHoursMin}–${snap.snapshot.remainingHoursMax}`,
    `steps: ${snap.snapshot.steps.length}`,
    "",
  ];
  for (const step of snap.snapshot.steps) {
    lines.push(
      `- [${step.kind}] ${step.order + 1}. **${step.name}** (\`${step.skillKey}\`) — ${step.status}, M ${step.mastery}, C ${step.confidence}`,
    );
  }
  lines.push("");
  return lines;
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}
