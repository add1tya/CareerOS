-- Sprint 24: Evidence Extraction Assistant v1 — confirmation-gated AI proposals.
--
-- First product consumer of the AI Adapter (ADR-0022). AI proposes; Evidence
-- Service alone writes Evidence / mastery fold / History on explicit confirm.
--
-- Architectural stance:
--  - Artifact text stored exactly as submitted (never rewritten).
--  - Proposal snapshot immutable; only status proposed → confirmed|declined.
--  - Stable proposal ids inside jsonb; confirm references ids, not indexes.
--  - AI confidence is presentation-only (not stored on Evidence).

create table if not exists public.evidence_extraction_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Exact artifact as submitted (refinement 4). Never normalize / rewrite.
  artifact_text text not null,
  artifact_byte_length integer not null check (artifact_byte_length >= 0),

  -- Immutable proposal snapshot after generation (refinement 5).
  proposals jsonb not null default '[]'::jsonb,

  -- Set only on confirm: list of accepted proposal ids (and optional clamped mastery).
  accepted jsonb,

  status text not null default 'proposed'
    check (status in ('proposed', 'confirmed', 'declined')),
  resolved_at timestamptz,

  ai_invocation_id uuid references public.ai_invocations (id) on delete set null,

  extraction_version integer not null,
  prompt_id text not null,
  prompt_version integer not null,
  adapter_version integer not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists evidence_extraction_sessions_user_idx
  on public.evidence_extraction_sessions (user_id, created_at desc);

create index if not exists evidence_extraction_sessions_user_status_idx
  on public.evidence_extraction_sessions (user_id, status);

drop trigger if exists evidence_extraction_sessions_set_updated_at
  on public.evidence_extraction_sessions;
create trigger evidence_extraction_sessions_set_updated_at
before update on public.evidence_extraction_sessions
for each row
execute function public.set_updated_at();

alter table public.skill_evidence
  add column if not exists generated_from_extraction_id uuid
    references public.evidence_extraction_sessions (id) on delete set null;

-- One Evidence row per skill per extraction session (idempotency).
create unique index if not exists skill_evidence_extraction_skill_unique
  on public.skill_evidence (generated_from_extraction_id, skill_key)
  where generated_from_extraction_id is not null;

alter table public.evidence_extraction_sessions enable row level security;

drop policy if exists "evidence_extraction_sessions_select_own"
  on public.evidence_extraction_sessions;
drop policy if exists "evidence_extraction_sessions_insert_own"
  on public.evidence_extraction_sessions;
drop policy if exists "evidence_extraction_sessions_update_own_proposed"
  on public.evidence_extraction_sessions;

create policy "evidence_extraction_sessions_select_own"
  on public.evidence_extraction_sessions for select
  using (auth.uid() = user_id);
create policy "evidence_extraction_sessions_insert_own"
  on public.evidence_extraction_sessions for insert
  with check (auth.uid() = user_id);
create policy "evidence_extraction_sessions_update_own_proposed"
  on public.evidence_extraction_sessions for update
  using (auth.uid() = user_id and status = 'proposed')
  with check (auth.uid() = user_id);
-- Intentionally NO delete: sessions preserved as signal.
