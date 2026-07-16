-- Sprint 5: Decision Engine v1 — deterministic skill recommendation (M5).
-- Decision history: append-only log of "highest-value skill to learn next".
-- Immutable at write (AR-05 / AR-15): select + insert own only, no update/delete.
-- No Claude, no tasks, no evidence — the recommendation is a Skill.

create table if not exists public.skill_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  recommended_skill_key text not null references public.skills (skill_key),
  goal_id uuid references public.goals (id) on delete set null,
  narrative text not null,
  -- Deterministic Decision Engine confidence (NOT AI confidence).
  confidence text not null
    check (confidence in ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH')),
  -- Full ranking factor breakdown (winner + every candidate) for debugging
  -- and future evaluation.
  factors jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now()
);

create index if not exists skill_recommendations_user_idx
  on public.skill_recommendations (user_id, generated_at desc);

alter table public.skill_recommendations enable row level security;

drop policy if exists "skill_recommendations_select_own" on public.skill_recommendations;
drop policy if exists "skill_recommendations_insert_own" on public.skill_recommendations;

create policy "skill_recommendations_select_own"
  on public.skill_recommendations
  for select
  using (auth.uid() = user_id);

create policy "skill_recommendations_insert_own"
  on public.skill_recommendations
  for insert
  with check (auth.uid() = user_id);

-- Intentionally NO update or delete policy: the decision history is append-only.
