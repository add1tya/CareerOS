-- Sprint 4: Skill Graph schema (M4).
-- Separation of concerns (approved plan + ADR-0001):
--   * skills               -> GLOBAL ontology: the required capabilities (user-agnostic)
--   * skill_dependencies   -> GLOBAL ontology: prerequisite edges (user-agnostic)
--   * user_skill_mastery   -> PER-USER overlay: this user's current mastery/confidence
-- No Evidence, no confidence decay, no recommendations, no Claude.

-- Skill Graph generation-complete flag (idempotency guard), mirrors Sprint 3.
alter table public.profiles
  add column if not exists skill_graph_generated_at timestamptz;

-- GLOBAL ontology: skills (required capabilities).
-- skill_key is an IMMUTABLE identifier — never changed once introduced (ADR-0001).
create table if not exists public.skills (
  skill_key text primary key,
  name text not null,
  description text not null,
  domain text not null
    check (domain in (
      'programming_systems',
      'cs_theory',
      'data_backend_infra',
      'math',
      'core_ml_dl',
      'llm_genai_systems',
      'evaluation_training_production',
      'software_systems_engineering',
      'meta_skills'
    )),
  ontology_category text not null
    check (ontology_category in ('core', 'advanced', 'specialization', 'future')),
  difficulty text not null
    check (difficulty in ('low', 'medium', 'high', 'very_high')),
  estimated_hours_min integer not null check (estimated_hours_min >= 0),
  estimated_hours_max integer not null check (estimated_hours_max >= estimated_hours_min),
  transferability text not null
    check (transferability in ('low', 'medium', 'high', 'very_high')),
  -- Deterministic ordering for visualization (stable, ontology-authored).
  display_order integer not null default 0,
  -- Ontology content version this row was seeded from (independent of schema).
  ontology_version text not null default 'v1',
  created_at timestamptz not null default now()
);

create index if not exists skills_domain_idx on public.skills (domain);
create index if not exists skills_category_idx on public.skills (ontology_category);

-- GLOBAL ontology: dependency edges (prerequisite relationships).
create table if not exists public.skill_dependencies (
  id uuid primary key default gen_random_uuid(),
  parent_skill_key text not null references public.skills (skill_key) on delete cascade,
  child_skill_key text not null references public.skills (skill_key) on delete cascade,
  type text not null default 'hard'
    check (type in ('hard', 'soft')),
  -- Parent mastery required before the child unlocks. Conservative default
  -- (roadmap OQ-01); real calibration deferred.
  minimum_mastery numeric(3, 2) not null default 0.30
    check (minimum_mastery >= 0 and minimum_mastery <= 1),
  rationale text,
  ontology_version text not null default 'v1',
  unique (parent_skill_key, child_skill_key)
);

create index if not exists skill_dependencies_child_idx
  on public.skill_dependencies (child_skill_key);
create index if not exists skill_dependencies_parent_idx
  on public.skill_dependencies (parent_skill_key);

-- PER-USER overlay: current mastery/confidence for one user's instance of a skill.
-- Full status set reserved from day one; Sprint 4 only writes locked/available.
create table if not exists public.user_skill_mastery (
  user_id uuid not null references auth.users (id) on delete cascade,
  skill_key text not null references public.skills (skill_key) on delete cascade,
  mastery numeric(4, 3) not null default 0
    check (mastery >= 0 and mastery <= 1),
  confidence numeric(4, 3) not null default 0
    check (confidence >= 0 and confidence <= 1),
  status text not null default 'locked'
    check (status in (
      'locked', 'available', 'learning', 'practicing',
      'verified', 'mastered', 'dormant', 'deprecated'
    )),
  source text not null default 'system'
    check (source in ('system', 'domain_advantage')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, skill_key)
);

create index if not exists user_skill_mastery_user_idx
  on public.user_skill_mastery (user_id);

drop trigger if exists user_skill_mastery_set_updated_at on public.user_skill_mastery;
create trigger user_skill_mastery_set_updated_at
before update on public.user_skill_mastery
for each row
execute function public.set_updated_at();

-- RLS.
alter table public.skills enable row level security;
alter table public.skill_dependencies enable row level security;
alter table public.user_skill_mastery enable row level security;

-- Global ontology tables are read-only reference data for any authenticated user.
-- They are populated by the seed migration, never written by user sessions.
drop policy if exists "skills_select_authenticated" on public.skills;
create policy "skills_select_authenticated"
  on public.skills
  for select
  to authenticated
  using (true);

drop policy if exists "skill_dependencies_select_authenticated" on public.skill_dependencies;
create policy "skill_dependencies_select_authenticated"
  on public.skill_dependencies
  for select
  to authenticated
  using (true);

-- Per-user overlay: standard own-row policies.
drop policy if exists "user_skill_mastery_select_own" on public.user_skill_mastery;
drop policy if exists "user_skill_mastery_insert_own" on public.user_skill_mastery;
drop policy if exists "user_skill_mastery_update_own" on public.user_skill_mastery;

create policy "user_skill_mastery_select_own"
  on public.user_skill_mastery
  for select
  using (auth.uid() = user_id);

create policy "user_skill_mastery_insert_own"
  on public.user_skill_mastery
  for insert
  with check (auth.uid() = user_id);

create policy "user_skill_mastery_update_own"
  on public.user_skill_mastery
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
