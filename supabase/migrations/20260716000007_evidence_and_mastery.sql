-- Sprint 7: Evidence & Mastery v1 — the deterministic feedback loop.
--
-- Closes the core loop: completing a Task produces an append-only Evidence
-- record, and Evidence deterministically updates the target Skill's Mastery and
-- Confidence (weighted, tier-capped) and its status. No Claude, no LLM.
--
-- Architectural stance (ADR-0004):
--  - Evidence is the SINGLE SOURCE OF TRUTH for progress (AR-03, AR-04). There
--    is no direct-write path to mastery/confidence that bypasses Evidence
--    (skill-graph-schema.md §5.4).
--  - `user_skill_mastery` is a MATERIALIZED CACHE of the reduction over the
--    Evidence log. It can, in principle, be rebuilt entirely by replaying
--    skill_evidence in recorded_at order (replayability is an architectural
--    goal — the mastery policy is a pure reducer).
--  - Every mastery/confidence value is attributable to Evidence, and every
--    Evidence row snapshots the mastery_policy_version that produced it, so
--    historical Evidence stays replayable across future policy revisions.
--  - Mastery (capability estimate) and Confidence (how verified it is) are
--    stored and updated as INDEPENDENT dimensions (roadmap B.1). Confidence
--    tier ceilings are non-additive (AD-11, skill-graph-schema.md §7).

-- ---------------------------------------------------------------------------
-- skill_evidence: the atomic, immutable unit of proof (skill-graph-schema.md
-- §6). Append-only (AR-15): select + insert own, NO update/delete.
-- ---------------------------------------------------------------------------
create table if not exists public.skill_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  skill_key text not null references public.skills (skill_key),

  -- Documented Evidence taxonomy (skill-graph-schema.md §6). V1 only writes
  -- 'self_report'; the full set is reserved so the type/tier map can evolve
  -- without a schema change.
  type text not null check (type in (
    'completed_project', 'quiz', 'interview', 'reflection', 'code_review',
    'github_activity', 'course_completion', 'boss_battle', 'portfolio',
    'self_report', 'self_report_override', 'external_validation',
    'mentor_validation'
  )),
  -- Confidence tier (1 Self Report .. 4 Mentor/External). Persisted explicitly
  -- so ceiling logic is not re-derived from `type` at read time.
  tier smallint not null check (tier between 1 and 4),

  -- Raw value this piece of evidence suggests, before weighted blending.
  implied_mastery numeric(4, 3) not null
    check (implied_mastery >= 0 and implied_mastery <= 1),

  content_ref text,
  source text not null default 'system'
    check (source in ('system', 'user', 'onboarding_interview')),

  -- Provenance: the Task whose completion produced this Evidence.
  generated_from_task_id uuid references public.tasks (id) on delete set null,

  -- Snapshot of the deterministic policy version that interpreted this Evidence,
  -- enabling deterministic replay across future policy revisions.
  mastery_policy_version integer not null default 1,

  recorded_at timestamptz not null default now()
);

create index if not exists skill_evidence_user_skill_idx
  on public.skill_evidence (user_id, skill_key, recorded_at asc);

-- One Evidence record per completed Task (idempotency backstop for the
-- Evidence subsystem's own guard).
create unique index if not exists skill_evidence_task_unique
  on public.skill_evidence (generated_from_task_id)
  where generated_from_task_id is not null;

-- ---------------------------------------------------------------------------
-- user_skill_mastery: extend the overlay cache with Evidence provenance + the
-- policy version that last computed it.
-- ---------------------------------------------------------------------------
alter table public.user_skill_mastery
  add column if not exists last_evidence_id uuid
    references public.skill_evidence (id) on delete set null,
  add column if not exists highest_tier_evidence_id uuid
    references public.skill_evidence (id) on delete set null,
  add column if not exists evidence_count integer not null default 0,
  add column if not exists mastery_policy_version integer not null default 1;

-- Allow 'evidence' as an overlay source now that rows are Evidence-updated.
alter table public.user_skill_mastery
  drop constraint if exists user_skill_mastery_source_check;
alter table public.user_skill_mastery
  add constraint user_skill_mastery_source_check
  check (source in ('system', 'domain_advantage', 'evidence'));

-- ---------------------------------------------------------------------------
-- tasks: bidirectional provenance — the Evidence a completed Task produced.
-- Doubles as the Evidence subsystem's idempotency key on re-completion.
-- ---------------------------------------------------------------------------
alter table public.tasks
  add column if not exists evidence_ref uuid
    references public.skill_evidence (id) on delete set null;

-- ---------------------------------------------------------------------------
-- RLS (AR-16): owner-only, append-only. Insert + select; NO update/delete —
-- the Evidence log is immutable at write (AR-05 / AR-15), like the decision
-- history in migration 0005.
-- ---------------------------------------------------------------------------
alter table public.skill_evidence enable row level security;

drop policy if exists "skill_evidence_select_own" on public.skill_evidence;
drop policy if exists "skill_evidence_insert_own" on public.skill_evidence;

create policy "skill_evidence_select_own"
  on public.skill_evidence for select using (auth.uid() = user_id);
create policy "skill_evidence_insert_own"
  on public.skill_evidence for insert with check (auth.uid() = user_id);
-- Intentionally NO update or delete policy: Evidence is append-only.
