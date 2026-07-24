-- Sprint 26: Resume Intelligence v1 — grounded resume drafts from CareerOS.
--
-- Composes professional prose from Resume Facts. Never writes Career Graph /
-- Evidence / Mastery / Goals / Planning / Recommendations (ADR-0024).
-- Drafts are append-only immutable snapshots.

create table if not exists public.resume_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Validated draft snapshot (sections + citations). Immutable.
  draft jsonb not null,

  -- Deterministic Resume Facts / Sections snapshot used as input (audit).
  resume_facts jsonb not null,
  resume_sections jsonb not null,
  resume_facts_hash text not null,

  ai_invocation_id uuid references public.ai_invocations (id) on delete set null,

  resume_intelligence_version integer not null,
  prompt_id text not null,
  prompt_version integer not null,
  adapter_version integer not null,

  created_at timestamptz not null default now()
);

create index if not exists resume_drafts_user_created_idx
  on public.resume_drafts (user_id, created_at desc, id desc);

alter table public.resume_drafts enable row level security;

drop policy if exists "resume_drafts_select_own" on public.resume_drafts;
drop policy if exists "resume_drafts_insert_own" on public.resume_drafts;

create policy "resume_drafts_select_own"
  on public.resume_drafts for select using (auth.uid() = user_id);
create policy "resume_drafts_insert_own"
  on public.resume_drafts for insert with check (auth.uid() = user_id);
-- Intentionally NO update / delete: drafts are immutable.
