-- Sprint 12: Overrides as Signal — append-only user disagreement (PR-15 / Principle 18).
--
-- Override = persisted user intent (this table).
-- Suppression = DERIVED policy from overrides + evidence (never stored) (ADR-0009).
-- Recommendation overrides never mutate Mission rows (refinement 4).
-- Task skips do not create Evidence.

-- ---------------------------------------------------------------------------
-- overrides: append-only intent log
-- ---------------------------------------------------------------------------
create table if not exists public.overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  kind text not null check (kind in (
    'recommendation_overridden',
    'task_skipped'
  )),

  skill_key text not null references public.skills (skill_key),
  recommendation_id uuid references public.skill_recommendations (id) on delete set null,
  task_id uuid references public.tasks (id) on delete set null,

  -- Structured reason drives eligibility logic; free text is provenance only.
  reason_code text not null check (reason_code in (
    'too_hard',
    'not_relevant_now',
    'wrong_focus',
    'need_break',
    'other'
  )),
  reason_text text,

  override_schema_version integer not null default 1,
  created_at timestamptz not null default now(),

  -- Kind-specific provenance: recommendation overrides need a recommendation;
  -- task skips need a task.
  constraint overrides_recommendation_refs check (
    kind <> 'recommendation_overridden'
    or recommendation_id is not null
  ),
  constraint overrides_task_refs check (
    kind <> 'task_skipped' or task_id is not null
  )
);

create index if not exists overrides_user_created_idx
  on public.overrides (user_id, created_at desc);
create index if not exists overrides_user_skill_idx
  on public.overrides (user_id, skill_key);
create index if not exists overrides_user_kind_idx
  on public.overrides (user_id, kind);

alter table public.overrides enable row level security;

drop policy if exists "overrides_select_own" on public.overrides;
drop policy if exists "overrides_insert_own" on public.overrides;

create policy "overrides_select_own"
  on public.overrides for select using (auth.uid() = user_id);
create policy "overrides_insert_own"
  on public.overrides for insert with check (auth.uid() = user_id);
-- Intentionally NO update / delete: overrides are immutable signal.

-- ---------------------------------------------------------------------------
-- history_events: extend past-tense catalog (additive only)
-- ---------------------------------------------------------------------------
alter table public.history_events
  drop constraint if exists history_events_event_type_check;

alter table public.history_events
  add constraint history_events_event_type_check check (event_type in (
    'recommendation_recorded',
    'mission_created',
    'quest_created',
    'quest_completed',
    'mission_completed',
    'task_completed',
    'evidence_recorded',
    'reflection_created',
    'reflection_confirmed',
    'reflection_declined',
    'recommendation_overridden',
    'task_skipped'
  ));

alter table public.history_events
  drop constraint if exists history_events_entity_kind_check;

alter table public.history_events
  add constraint history_events_entity_kind_check check (entity_kind in (
    'skill_recommendation',
    'mission',
    'quest',
    'task',
    'skill_evidence',
    'reflection',
    'override'
  ));
