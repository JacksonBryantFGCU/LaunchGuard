-- Scenario-based practice persistence (Phase 2).
--
-- A practice scenario attempt belongs to an existing review_sessions row -
-- one Black Friday practice run stays one review_sessions row, with up to
-- five practice_scenario_attempts hanging off it (one per scenario). This
-- migration only adds new structures; it never touches review_sessions,
-- review_redlines, review_submissions, stress_test_progress, or
-- review_results from the prior migration.
--
-- Security model is unchanged from 20260926180000_review_sessions.sql:
-- Clerk remains the identity source, Express is the only trusted caller
-- (via the Supabase secret key, which bypasses RLS), and RLS is enabled
-- below purely as defense in depth - no anon/authenticated policies exist,
-- so those Postgres roles get zero access to any table here.
--
-- "available"/"locked" scenario status is deliberately NOT a column value:
-- a scenario with no attempt row is available-or-locked depending on
-- whether the prior scenario in sequence is complete, which the API
-- derives rather than stores.

create table if not exists practice_scenario_attempts (
  id uuid primary key default gen_random_uuid(),
  review_session_id uuid not null references review_sessions (id) on delete cascade,

  practice_scenario_id text not null,

  status text not null default 'investigating' check (
    status in ('investigating', 'submitted', 'feedback_ready', 'consequence_ready', 'completed')
  ),

  started_at timestamptz not null default now(),
  submitted_at timestamptz null,
  completed_at timestamptz null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (review_session_id, practice_scenario_id)
);

create index if not exists practice_scenario_attempts_review_session_id_idx
  on practice_scenario_attempts (review_session_id);

create table if not exists practice_scenario_responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null unique references practice_scenario_attempts (id) on delete cascade,

  diagnosis text not null default '',
  investigation_plan text not null default '',
  immediate_action text not null default '',
  architecture_decision text not null default '',
  tradeoff text not null default '',

  severity text null check (severity in ('low', 'medium', 'high', 'critical')),
  confidence text null check (confidence in ('low', 'medium', 'high')),

  submitted_at timestamptz null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists practice_scenario_response_requirements (
  attempt_id uuid not null references practice_scenario_attempts (id) on delete cascade,
  requirement_id text not null,

  primary key (attempt_id, requirement_id)
);

create table if not exists practice_scenario_evidence (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references practice_scenario_attempts (id) on delete cascade,

  source_type text not null check (
    source_type in (
      'requirement',
      'constraint',
      'scenario_evidence',
      'architecture_node',
      'architecture_edge',
      'architect_statement',
      'architecture_finding'
    )
  ),
  source_id text null,

  label text not null,
  content text not null,

  -- Only ever a Redline-normalized turn id (see voice_transcript_turns.turn_id
  -- from the prior migration) - never a raw ElevenLabs id. Not a foreign key:
  -- transcript turns aren't unique per session by turn_id alone in a way that
  -- composes cleanly here, so the API validates the turn belongs to the same
  -- review session before storing this reference.
  transcript_turn_id text null,

  created_at timestamptz not null default now()
);

create index if not exists practice_scenario_evidence_attempt_id_idx
  on practice_scenario_evidence (attempt_id);

create table if not exists practice_scenario_response_evidence (
  attempt_id uuid not null references practice_scenario_attempts (id) on delete cascade,
  evidence_id uuid not null references practice_scenario_evidence (id) on delete cascade,

  primary key (attempt_id, evidence_id)
);

-- Learner-safe deterministic evaluation only. result_data must never
-- contain expectedConcepts/acceptedActionConcepts/severityTruth/private
-- phrase dictionaries - only ScenarioEvaluationResult's safe projection
-- (packages/shared/src/practiceScenario.ts), enforced by the API layer.
create table if not exists practice_scenario_results (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null unique references practice_scenario_attempts (id) on delete cascade,

  objective_score integer not null,
  objective_max_score integer not null,

  result_data jsonb not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists practice_scenario_results_attempt_id_idx
  on practice_scenario_results (attempt_id);

alter table practice_scenario_attempts enable row level security;
alter table practice_scenario_responses enable row level security;
alter table practice_scenario_response_requirements enable row level security;
alter table practice_scenario_evidence enable row level security;
alter table practice_scenario_response_evidence enable row level security;
alter table practice_scenario_results enable row level security;

-- No policies are created for anon/authenticated: with RLS enabled and zero
-- policies, every table denies all access to those roles by default. Only
-- the Supabase secret key (used exclusively by the Express API) bypasses
-- RLS and can read/write these tables.
revoke all on
  practice_scenario_attempts,
  practice_scenario_responses,
  practice_scenario_response_requirements,
  practice_scenario_evidence,
  practice_scenario_response_evidence,
  practice_scenario_results
  from anon, authenticated;
