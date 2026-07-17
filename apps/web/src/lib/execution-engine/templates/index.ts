/**
 * Execution template registry (Sprint 6).
 *
 * Templates are hand-authored, reusable, versioned definitions — the "source
 * code" the deterministic Execution Engine compiles into per-user Mission/Quest/
 * Task INSTANCES. They are treated as immutable, versioned assets, similar to
 * database migrations (ADR-0003):
 *
 *  - To evolve a skill's execution plan, bump `templateVersion` and change the
 *    definition. Existing generated Missions are frozen at their recorded
 *    version and are never retroactively mutated.
 *  - Task candidates come from the ontology's Suggested Projects (AR-09), not
 *    from an LLM.
 *
 * One template per supported skill lives in its own file and is registered here.
 */

/** A single-session executable unit — the leaf the user acts on. */
export type TaskTemplate = {
  title: string;
  description: string;
  estimatedMinutes: number;
};

/** A days-to-weeks unit of work; contains 3–5 ordered tasks. */
export type QuestTemplate = {
  title: string;
  description: string;
  tasks: TaskTemplate[];
};

/**
 * The full execution definition for one skill. `quests` is ordered; the engine
 * materializes them lazily, one at a time (ADR-0003).
 */
export type SkillExecutionTemplate = {
  skillKey: string;
  templateVersion: number;
  mission: { title: string; description: string };
  quests: QuestTemplate[];
};

import { calculusTemplate } from "./calculus";
import { communicationTemplate } from "./communication";
import { csFundamentalsTemplate } from "./cs-fundamentals";
import { gitTemplate } from "./git";
import { linearAlgebraTemplate } from "./linear-algebra";
import { linuxTemplate } from "./linux";
import { probabilityTemplate } from "./probability";
import { projectsTemplate } from "./projects";
import { pythonTemplate } from "./python";
import { typescriptTemplate } from "./typescript";

const TEMPLATES: SkillExecutionTemplate[] = [
  pythonTemplate,
  typescriptTemplate,
  gitTemplate,
  linuxTemplate,
  csFundamentalsTemplate,
  linearAlgebraTemplate,
  calculusTemplate,
  probabilityTemplate,
  communicationTemplate,
  projectsTemplate,
];

const TEMPLATE_BY_SKILL: ReadonlyMap<string, SkillExecutionTemplate> = new Map(
  TEMPLATES.map((template) => [template.skillKey, template]),
);

/** Skill keys the Execution Engine can currently generate work for. */
export const SUPPORTED_SKILL_KEYS: readonly string[] = TEMPLATES.map(
  (template) => template.skillKey,
);

/**
 * Returns the immutable execution template for a skill, or null if the skill
 * has no authored template yet (honest empty state — we fail loud rather than
 * fabricate generic tasks).
 */
export function getExecutionTemplate(
  skillKey: string,
): SkillExecutionTemplate | null {
  return TEMPLATE_BY_SKILL.get(skillKey) ?? null;
}
