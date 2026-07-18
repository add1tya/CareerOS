-- Sprint 8: Reflection v1 — user-initiated, confirmation-gated self-assessment.
--
-- A second, USER-DRIVEN path into the Evidence pipeline (ADR-0005). The user
-- records a structured self-assessment of a skill; a deterministic, rule-based
-- Reflection Engine turns it into a PROPOSED update; and only after explicit
-- confirmation is that proposal committed as Reflection-type (Tier 2) Evidence
-- through the exact Sprint 7 pipeline. No Claude, no LLM, no free-text parsing.
--
-- Architectural stance (ADR-0005):
--  - Reflection never writes mastery/confidence directly. Confirming appends
--    Evidence (AR-04); the pure reducer folds it into the overlay.
--  - The three ownership states are kept DISTINCT (career-graph-schema.md §3.10):
--    raw user response, system interpretation (derived_updates), and confirmed
--    outcome (status / confirmed_at).
--  - A Reflection is IMMUTABLE once created (refinement 1): its content and
--    derived_updates never change. To revise, the user creates a NEW Reflection.
--    The only permitted mutation is the one-way status transition
--    proposed -> confirmed | declined, enforced at the DB via RLS.
--  - Full provenance/explainability: the row snapshots the reflection-engine
--    version, the mastery-policy version assumed at proposal time, and the
--    evaluated skill state (mastery/confidence/status) the user reflected on.

-- ---------------------------------------------------------------------------
-- reflections: structured self-review records (career-graph-schema.md §3.10,
-- roadmap B.12).
-- ---------------------------------------------------------------------------
create table if not exists public.reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- V1 only writes 'user_initiated' (PR-17 / EX-11: no automatic triggers).
  trigger text not null default 'user_initiated'
    check (trigger in ('milestone', 'user_initiated', 'recovery_check_in')),

  -- The skill this reflection pertains to (V1: exactly one).
  skill_key text not null references public.skills (skill_key),

  -- Raw inputs (immutable). `self_assessment` is the STRUCTURED selection that
  -- deterministically drives the proposal; `response_text` is optional free-text
  -- qualitative context only (skill-graph-schema.md §6).
  prompt_shown text not null,
  self_assessment text not null,
  response_text text,

  -- System interpretation: the proposed updates the Reflection Engine derived.
  -- Structured list, immutable once written (refinement 1).
  derived_updates jsonb not null default '[]'::jsonb,

  -- Confirmed outcome: one-way lifecycle. Mutable only while 'proposed' (RLS).
  status text not null default 'proposed'
    check (status in ('proposed', 'confirmed', 'declined')),
  confirmed_at timestamptz,

  -- Reproducibility snapshots (refinement 2): both the engine that produced the
  -- proposal and the mastery policy assumed at proposal time.
  reflection_engine_version integer not null default 1,
  mastery_policy_version integer not null default 1,

  -- Evaluated skill state at reflection time (refinement 3), so future
  -- explanations can reference exactly what the user reflected on.
  evaluated_mastery numeric(4, 3) not null,
  evaluated_confidence numeric(4, 3) not null,
  evaluated_status text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reflections_user_idx
  on public.reflections (user_id, created_at desc);
create index if not exists reflections_user_status_idx
  on public.reflections (user_id, status);

drop trigger if exists reflections_set_updated_at on public.reflections;
create trigger reflections_set_updated_at
before update on public.reflections
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- skill_evidence: add TYPED provenance for reflection-produced Evidence
-- (refinement 5 — explicit FK over a polymorphic origin model).
-- ---------------------------------------------------------------------------
alter table public.skill_evidence
  add column if not exists generated_from_reflection_id uuid
    references public.reflections (id) on delete set null;

-- One Evidence record per Reflection (V1 single-skill) — idempotency backstop
-- for confirm, complementing the reflection status guard.
create unique index if not exists skill_evidence_reflection_unique
  on public.skill_evidence (generated_from_reflection_id)
  where generated_from_reflection_id is not null;

-- ---------------------------------------------------------------------------
-- RLS (AR-16): owner-only. Select/insert own; UPDATE allowed ONLY while the
-- reflection is still 'proposed' (the USING clause sees the existing row), which
-- enforces post-decision immutability at the database. No delete.
-- ---------------------------------------------------------------------------
alter table public.reflections enable row level security;

drop policy if exists "reflections_select_own" on public.reflections;
drop policy if exists "reflections_insert_own" on public.reflections;
drop policy if exists "reflections_update_own_proposed" on public.reflections;

create policy "reflections_select_own"
  on public.reflections for select using (auth.uid() = user_id);
create policy "reflections_insert_own"
  on public.reflections for insert with check (auth.uid() = user_id);
create policy "reflections_update_own_proposed"
  on public.reflections for update
  using (auth.uid() = user_id and status = 'proposed')
  with check (auth.uid() = user_id);
-- Intentionally NO delete policy: reflections are preserved as signal, even
-- when declined.
