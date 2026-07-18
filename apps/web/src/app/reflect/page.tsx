import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { ReflectionForm, type ReflectableSkill } from "@/components/reflection-form";
import { ReflectionList } from "@/components/reflection-list";
import { ReflectionProposal } from "@/components/reflection-proposal";
import { listReflections } from "@/lib/reflection/reflection-service";
import { getProfile, isOnboardingComplete } from "@/lib/profile-service";
import { getSkillGraph } from "@/lib/skill-graph/skill-graph-service";
import { createClient } from "@/lib/supabase/server";

export default async function ReflectPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile(supabase, user.id);
  if (!isOnboardingComplete(profile)) {
    redirect("/onboarding");
  }

  const [skillGraph, reflections] = await Promise.all([
    getSkillGraph(supabase, user.id),
    listReflections(supabase, user.id),
  ]);

  // Only unlocked skills can be reflected on.
  const reflectableSkills: ReflectableSkill[] = skillGraph.nodes
    .filter((node) => node.status !== "locked")
    .map((node) => ({ skillKey: node.skill_key, name: node.name }));

  const skillNames = new Map(
    skillGraph.nodes.map((node) => [node.skill_key, node.name]),
  );

  const pending = reflections.filter((r) => r.status === "proposed");
  const decided = reflections.filter((r) => r.status !== "proposed");

  return (
    <AppShell userEmail={user.email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Reflection</h1>
          <p className="text-sm text-muted-foreground">
            A confirmation-gated way to update your Skill Graph from your own
            self-assessment. Reflections propose changes; you decide what commits.
          </p>
        </div>

        {pending.length > 0 ? (
          <div className="space-y-4">
            {pending.map((reflection) => (
              <ReflectionProposal
                key={reflection.id}
                reflection={reflection}
                skillName={skillNames.get(reflection.skillKey) ?? reflection.skillKey}
              />
            ))}
          </div>
        ) : null}

        <ReflectionForm skills={reflectableSkills} />

        <ReflectionList reflections={decided} skillNames={skillNames} />
      </div>
    </AppShell>
  );
}
