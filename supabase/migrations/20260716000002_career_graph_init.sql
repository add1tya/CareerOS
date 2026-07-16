-- Sprint 3: Career Graph Initialization.
-- Creates ONE root goal + constraints from onboarding, and marks initialization.
-- No Skill Graph, Domain Advantage, recommendations, or nested goal management.

-- Generation-complete flag lives on profiles (no separate metadata table).
alter table public.profiles
  add column if not exists career_graph_initialized_at timestamptz;

-- Goals: hierarchical from day one via parent_goal_id, but Sprint 3 only
-- creates a single root goal (parent_goal_id = null, source = 'system').
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  parent_goal_id uuid references public.goals (id) on delete cascade,
  title text not null,
  deadline date,
  status text not null default 'active'
    check (status in ('active', 'completed', 'paused', 'archived', 'cancelled')),
  source text not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists goals_user_id_idx
  on public.goals (user_id);
create index if not exists goals_user_parent_idx
  on public.goals (user_id, parent_goal_id);

-- Constraints: one row per user for V1 (weekly hours only for now).
create table if not exists public.constraints (
  user_id uuid primary key references auth.users (id) on delete cascade,
  available_hours_per_week integer not null
    check (available_hours_per_week >= 1 and available_hours_per_week <= 80),
  last_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Reuse the shared updated_at trigger function from the profiles migration.
drop trigger if exists goals_set_updated_at on public.goals;
create trigger goals_set_updated_at
before update on public.goals
for each row
execute function public.set_updated_at();

drop trigger if exists constraints_set_updated_at on public.constraints;
create trigger constraints_set_updated_at
before update on public.constraints
for each row
execute function public.set_updated_at();

alter table public.goals enable row level security;
alter table public.constraints enable row level security;

drop policy if exists "goals_select_own" on public.goals;
drop policy if exists "goals_insert_own" on public.goals;
drop policy if exists "goals_update_own" on public.goals;

create policy "goals_select_own"
  on public.goals
  for select
  using (auth.uid() = user_id);

create policy "goals_insert_own"
  on public.goals
  for insert
  with check (auth.uid() = user_id);

create policy "goals_update_own"
  on public.goals
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "constraints_select_own" on public.constraints;
drop policy if exists "constraints_insert_own" on public.constraints;
drop policy if exists "constraints_update_own" on public.constraints;

create policy "constraints_select_own"
  on public.constraints
  for select
  using (auth.uid() = user_id);

create policy "constraints_insert_own"
  on public.constraints
  for insert
  with check (auth.uid() = user_id);

create policy "constraints_update_own"
  on public.constraints
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
