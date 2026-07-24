-- Sprint 33: Portfolio Intelligence v1 — grounded portfolio drafts from CareerOS.
--
-- Proof-oriented showcase from Portfolio Facts. Never writes Career Graph /
-- Evidence / Mastery / Goals / Planning / Recommendations / resume_drafts /
-- career_gap_reports (ADR-0028). Drafts are append-only immutable snapshots.

create table if not exists public.portfolio_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  draft jsonb not null,
  portfolio_facts jsonb not null,
  portfolio_sections jsonb not null,
  portfolio_facts_hash text not null,

  generated_at timestamptz not null,
  goal_title text,
  goal_status text,
  goal_deadline text,
  evidence_count integer not null default 0,

  ai_invocation_id uuid references public.ai_invocations (id) on delete set null,

  portfolio_intelligence_version integer not null,
  prompt_id text not null,
  prompt_version integer not null,
  adapter_version integer not null,

  created_at timestamptz not null default now()
);

create index if not exists portfolio_drafts_user_created_idx
  on public.portfolio_drafts (user_id, created_at desc, id desc);

alter table public.portfolio_drafts enable row level security;

drop policy if exists "portfolio_drafts_select_own" on public.portfolio_drafts;
drop policy if exists "portfolio_drafts_insert_own" on public.portfolio_drafts;

create policy "portfolio_drafts_select_own"
  on public.portfolio_drafts for select using (auth.uid() = user_id);
create policy "portfolio_drafts_insert_own"
  on public.portfolio_drafts for insert with check (auth.uid() = user_id);
-- Intentionally NO update / delete: drafts are immutable.
