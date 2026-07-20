-- Sprint 10: History Event Log — Career Graph append-only audit timeline.
--
-- The unifying, cross-component event log (career-graph-schema.md §3.14, AR-15).
-- Domain tables remain the source of truth; History is an INDEX of what happened
-- (references + optional light payload), never a duplicate datastore (ADR-0007).
--
-- Architectural stance:
--  - Append-only forever: SELECT + INSERT own; NO UPDATE / NO DELETE policies.
--  - correlation_id groups multiple events from a single user action.
--  - Deterministic read order: occurred_at DESC, then id DESC (tie-break).
--  - Forward-only: no backfill of pre-Sprint-10 activity.
--  - Not event-sourcing: History does not rebuild domain state; Evidence does
--    for mastery, and other tables own their own truth.

create table if not exists public.history_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Past-tense event names (mission_created, evidence_recorded, …). Extending
  -- the set is an additive migration; never rename existing values.
  event_type text not null check (event_type in (
    'recommendation_recorded',
    'mission_created',
    'quest_created',
    'quest_completed',
    'mission_completed',
    'task_completed',
    'evidence_recorded',
    'reflection_created',
    'reflection_confirmed',
    'reflection_declined'
  )),

  -- Reference to the authoritative domain row (History is an index, not a copy).
  entity_kind text not null check (entity_kind in (
    'skill_recommendation',
    'mission',
    'quest',
    'task',
    'skill_evidence',
    'reflection'
  )),
  entity_id uuid not null,

  -- Groups related events from one user action (refinement 1).
  correlation_id uuid not null,

  actor text not null check (actor in (
    'user',
    'decision_engine',
    'execution_engine',
    'evidence_engine',
    'reflection_engine'
  )),

  -- OPTIONAL convenience metadata only. Never the source of truth (refinement 4).
  payload jsonb not null default '{}'::jsonb,

  history_schema_version integer not null default 1,
  occurred_at timestamptz not null default now()
);

-- Primary timeline index: newest first; id breaks timestamp ties (refinement 2).
create index if not exists history_events_user_timeline_idx
  on public.history_events (user_id, occurred_at desc, id desc);

create index if not exists history_events_user_correlation_idx
  on public.history_events (user_id, correlation_id);

create index if not exists history_events_user_type_idx
  on public.history_events (user_id, event_type);

-- RLS (AR-16): owner-only. Insert-only — no update, no delete (AR-15).
alter table public.history_events enable row level security;

drop policy if exists "history_events_select_own" on public.history_events;
drop policy if exists "history_events_insert_own" on public.history_events;

create policy "history_events_select_own"
  on public.history_events for select using (auth.uid() = user_id);
create policy "history_events_insert_own"
  on public.history_events for insert with check (auth.uid() = user_id);
-- Intentionally NO update / delete policies: History is immutable once written.
