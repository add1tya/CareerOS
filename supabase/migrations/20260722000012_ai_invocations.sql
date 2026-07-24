-- Sprint 23: AI Adapter Architecture — append-only invocation provenance.
--
-- LLM plumbing audit log (ADR-0020). Distinct from History Event Log (ADR-0007)
-- and from Reasoning Traces. Never mutates domain Goal / Mastery / Decision state.
--
-- Architectural stance:
--  - Append-only forever: SELECT + INSERT only; NO UPDATE / NO DELETE policies.
--  - user_id + RLS from day one (AR-16).
--  - Records Runtime outcomes (succeeded / failed / validation_failed / timeout /
--    cancelled), not career events.

create table if not exists public.ai_invocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  task_type text not null,
  provider_id text not null,
  model text,

  prompt_id text not null,
  prompt_version integer not null,
  adapter_version integer not null,

  -- AR-14 scaffolding: hash(task + input + rendered prompt); no mutating AI yet.
  input_hash text not null,

  status text not null check (status in (
    'succeeded',
    'failed',
    'validation_failed',
    'timeout',
    'cancelled'
  )),
  error_code text,
  latency_ms integer not null check (latency_ms >= 0),
  attempt_count integer not null default 1 check (attempt_count >= 0),

  created_at timestamptz not null default now()
);

create index if not exists ai_invocations_user_created_idx
  on public.ai_invocations (user_id, created_at desc, id desc);

create index if not exists ai_invocations_user_task_idx
  on public.ai_invocations (user_id, task_type, created_at desc);

-- RLS (AR-16): owner-only. Insert-only — no update, no delete (append-only).
alter table public.ai_invocations enable row level security;

drop policy if exists "ai_invocations_select_own" on public.ai_invocations;
drop policy if exists "ai_invocations_insert_own" on public.ai_invocations;

create policy "ai_invocations_select_own"
  on public.ai_invocations for select using (auth.uid() = user_id);
create policy "ai_invocations_insert_own"
  on public.ai_invocations for insert with check (auth.uid() = user_id);
-- Intentionally NO update / delete policies: provenance is immutable once written.
