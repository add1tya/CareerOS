-- Sprint 27: Career Gap Analysis v1 — grounded gap reports from CareerOS.
--
-- Summarizes verified strengths, missing evidence, and weak mastery.
-- Never writes Career Graph / Evidence / Mastery / Goals / Planning /
-- Recommendations (ADR-0025). Reports are append-only immutable snapshots.

create table if not exists public.career_gap_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Validated report snapshot (sections + citations + metadata). Immutable.
  report jsonb not null,

  -- Deterministic Gap Facts / Sections snapshot used as input (audit).
  gap_facts jsonb not null,
  gap_sections jsonb not null,
  gap_facts_hash text not null,

  -- Deterministic report metadata (also embedded in report jsonb).
  generated_at timestamptz not null,
  goal_title text,
  goal_status text,
  goal_deadline text,

  ai_invocation_id uuid references public.ai_invocations (id) on delete set null,

  gap_analysis_version integer not null,
  prompt_id text not null,
  prompt_version integer not null,
  adapter_version integer not null,

  created_at timestamptz not null default now()
);

create index if not exists career_gap_reports_user_created_idx
  on public.career_gap_reports (user_id, created_at desc, id desc);

alter table public.career_gap_reports enable row level security;

drop policy if exists "career_gap_reports_select_own" on public.career_gap_reports;
drop policy if exists "career_gap_reports_insert_own" on public.career_gap_reports;

create policy "career_gap_reports_select_own"
  on public.career_gap_reports for select using (auth.uid() = user_id);
create policy "career_gap_reports_insert_own"
  on public.career_gap_reports for insert with check (auth.uid() = user_id);
-- Intentionally NO update / delete: reports are immutable.
