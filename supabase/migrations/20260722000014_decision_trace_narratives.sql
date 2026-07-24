-- Sprint 25: Decision Trace Narrator v1 — AI prose for deterministic traces.
--
-- Renders Explainability Trace Facts as narrative. Never mutates ranking /
-- factors / recommendation selection (ADR-0023). Narratives are immutable;
-- TRACE_NARRATOR_VERSION changes create new rows.

create table if not exists public.decision_trace_narratives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  recommendation_id uuid not null
    references public.skill_recommendations (id) on delete cascade,

  -- Validated Narrative Facts snapshot (prose + citations). Immutable.
  narrative jsonb not null,

  trace_facts_hash text not null,

  ai_invocation_id uuid references public.ai_invocations (id) on delete set null,

  trace_narrator_version integer not null,
  decision_explanation_version integer not null,
  prompt_id text not null,
  prompt_version integer not null,
  adapter_version integer not null,

  created_at timestamptz not null default now()
);

-- One narrative per recommendation per narrator version (immutable; bump version to regenerate).
create unique index if not exists decision_trace_narratives_rec_version_unique
  on public.decision_trace_narratives (recommendation_id, trace_narrator_version);

create index if not exists decision_trace_narratives_user_idx
  on public.decision_trace_narratives (user_id, created_at desc);

alter table public.decision_trace_narratives enable row level security;

drop policy if exists "decision_trace_narratives_select_own"
  on public.decision_trace_narratives;
drop policy if exists "decision_trace_narratives_insert_own"
  on public.decision_trace_narratives;

create policy "decision_trace_narratives_select_own"
  on public.decision_trace_narratives for select
  using (auth.uid() = user_id);
create policy "decision_trace_narratives_insert_own"
  on public.decision_trace_narratives for insert
  with check (auth.uid() = user_id);
-- Intentionally NO update / delete: narratives are immutable snapshots.
