-- Sprint 6: Execution Engine v1 (M-execution) — deterministic work hierarchy.
--
-- Converts the single recommended Skill (Decision Engine, Sprint 5) into a
-- concrete execution hierarchy: Mission -> Quest -> Task. Entirely rule-based
-- and template-driven — NO Claude, NO LLM, NO evidence/mastery/XP/streaks.
--
-- These are PERSISTED user-specific runtime INSTANCES (AR-02: Missions/Quests/
-- Tasks are persisted when committed to active work). They are generated from
-- versioned, immutable TypeScript TEMPLATES (see apps/web/src/lib/
-- execution-engine/templates). Templates are definitions; the rows below are
-- instances and are never mutated by later template revisions.
--
-- Provenance (ADR-0003): every Mission records the full chain that produced it
-- (Recommendation -> Mission), plus the exact template + version used, so the
-- generation is fully explainable and reproducible.
--
-- Lazy generation (ADR-0003): a Mission is created with only its first Quest and
-- that Quest's Tasks. The next Quest is materialized only when the active Quest
-- is completed. "Compute rather than persist" — derived state stays minimal.

-- Execution status shared by Missions and Quests.
do $$ begin
  create type public.execution_status as enum (
    'proposed', 'active', 'completed', 'skipped', 'abandoned'
  );
exception
  when duplicate_object then null;
end $$;

-- Task lifecycle. In V1 the only user action is completing a Task; Quest/Mission
-- transitions are deterministic server-side consequences of Task completion.
do $$ begin
  create type public.task_status as enum (
    'pending', 'active', 'completed', 'skipped'
  );
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Missions: multi-week thematic container generated from one recommendation.
-- ---------------------------------------------------------------------------
create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Provenance: the complete Recommendation -> Mission chain (ADR-0003).
  generated_from_skill_key text not null references public.skills (skill_key),
  generated_from_recommendation_id uuid
    references public.skill_recommendations (id) on delete set null,
  goal_id uuid references public.goals (id) on delete set null,

  title text not null,
  description text not null,
  status public.execution_status not null default 'active',

  -- Template identity + version this instance was generated from. A later
  -- template revision bumps template_version for NEW missions only; existing
  -- rows are frozen at the version recorded here (immutability, ADR-0003).
  source text not null default 'template',
  template_key text not null,
  template_version integer not null,

  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists missions_user_idx
  on public.missions (user_id, created_at desc);
create index if not exists missions_user_skill_idx
  on public.missions (user_id, generated_from_skill_key);

-- ---------------------------------------------------------------------------
-- Quests: days-to-weeks unit of work within a Mission. Materialized lazily,
-- one active at a time. order_index preserves the template's Quest sequence.
-- ---------------------------------------------------------------------------
create table if not exists public.quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mission_id uuid not null references public.missions (id) on delete cascade,

  title text not null,
  description text not null,
  status public.execution_status not null default 'active',
  order_index integer not null,

  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (mission_id, order_index)
);

create index if not exists quests_mission_idx
  on public.quests (mission_id, order_index);

-- ---------------------------------------------------------------------------
-- Tasks: single-session executable unit within a Quest. The only work item a
-- user directly acts on in V1 (completion).
-- ---------------------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  quest_id uuid not null references public.quests (id) on delete cascade,

  -- Traceability back to the skill this task develops (denormalized for reads).
  generated_from_skill_key text not null references public.skills (skill_key),

  title text not null,
  description text not null,
  estimated_minutes integer not null,
  order_index integer not null,
  status public.task_status not null default 'pending',

  source text not null default 'template',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (quest_id, order_index)
);

create index if not exists tasks_quest_idx
  on public.tasks (quest_id, order_index);
create index if not exists tasks_user_idx
  on public.tasks (user_id, status);

-- ---------------------------------------------------------------------------
-- updated_at triggers (reuse public.set_updated_at from migration 0001).
-- ---------------------------------------------------------------------------
drop trigger if exists missions_set_updated_at on public.missions;
create trigger missions_set_updated_at
before update on public.missions
for each row
execute function public.set_updated_at();

drop trigger if exists quests_set_updated_at on public.quests;
create trigger quests_set_updated_at
before update on public.quests
for each row
execute function public.set_updated_at();

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS (AR-16): every user-scoped table is owner-only. Select/insert/update are
-- allowed (generation inserts; task completion + deterministic Quest/Mission
-- transitions update). No delete policy — execution history is not user-erased.
-- ---------------------------------------------------------------------------
alter table public.missions enable row level security;
alter table public.quests enable row level security;
alter table public.tasks enable row level security;

drop policy if exists "missions_select_own" on public.missions;
drop policy if exists "missions_insert_own" on public.missions;
drop policy if exists "missions_update_own" on public.missions;

create policy "missions_select_own"
  on public.missions for select using (auth.uid() = user_id);
create policy "missions_insert_own"
  on public.missions for insert with check (auth.uid() = user_id);
create policy "missions_update_own"
  on public.missions for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "quests_select_own" on public.quests;
drop policy if exists "quests_insert_own" on public.quests;
drop policy if exists "quests_update_own" on public.quests;

create policy "quests_select_own"
  on public.quests for select using (auth.uid() = user_id);
create policy "quests_insert_own"
  on public.quests for insert with check (auth.uid() = user_id);
create policy "quests_update_own"
  on public.quests for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tasks_select_own" on public.tasks;
drop policy if exists "tasks_insert_own" on public.tasks;
drop policy if exists "tasks_update_own" on public.tasks;

create policy "tasks_select_own"
  on public.tasks for select using (auth.uid() = user_id);
create policy "tasks_insert_own"
  on public.tasks for insert with check (auth.uid() = user_id);
create policy "tasks_update_own"
  on public.tasks for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
