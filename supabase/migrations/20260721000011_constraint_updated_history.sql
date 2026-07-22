-- Sprint 16: Opportunity Assessment — History fact channel for constraint changes.
--
-- Opportunity Assessment (ADR-0013) is a pure projection. It detects
-- constraint_change_unlock from History `constraint_updated` events.
-- Additive catalog extension only (past-tense; never rename existing values).

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
    'task_skipped',
    'constraint_updated'
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
    'override',
    'constraint'
  ));
