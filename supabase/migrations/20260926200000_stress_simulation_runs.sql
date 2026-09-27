-- Stress simulation run persistence (Live Stress Simulation Engine).
--
-- One row per stress-test run against a practice scenario attempt's current
-- architecture. Runs are immutable and never overwritten (spec #35) - each
-- rerun after a design change inserts a new row, giving the run-history and
-- before/after comparison views something to read.
--
-- Per spec #34, frames are NOT persisted here: parameters + the
-- modifications snapshot are enough to deterministically regenerate the
-- full timeline on demand, so only the run's final aggregate result is
-- stored. Private engine formulas/coefficients never appear in result_data -
-- only the safe StressTestTimelineResult projection
-- (packages/shared/src/stressLab.ts).
--
-- Security model is unchanged from prior migrations: Express (via the
-- Supabase secret key) is the only trusted caller; RLS is enabled purely as
-- defense in depth, with zero anon/authenticated policies.

create table if not exists stress_simulation_runs (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references practice_scenario_attempts (id) on delete cascade,

  test_id text not null,
  run_number integer not null,

  parameters jsonb not null default '{}'::jsonb,
  modifications jsonb not null default '[]'::jsonb,

  passed boolean not null,
  final_metrics jsonb not null default '{}'::jsonb,
  requirement_results jsonb not null default '[]'::jsonb,
  bottlenecks jsonb not null default '[]'::jsonb,
  summary text not null default '',

  created_at timestamptz not null default now(),

  unique (attempt_id, test_id, run_number)
);

create index if not exists stress_simulation_runs_attempt_id_idx
  on stress_simulation_runs (attempt_id);

alter table stress_simulation_runs enable row level security;

revoke all on stress_simulation_runs from anon, authenticated;
