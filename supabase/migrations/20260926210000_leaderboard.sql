-- Leaderboard (Phase 3): opt-in public ranking over practice scenario scores.
--
-- user_id stays plain text, exactly like every other table in this schema
-- (review_sessions, practice_scenario_attempts) - there is still no local
-- users table, Clerk remains the sole identity source, and the Express API
-- (via the Supabase secret key, which bypasses RLS) is the only trusted
-- caller. RLS is enabled below purely as defense in depth.
--
-- Only practice scenarios have a fair, server-authoritative, deterministic
-- score today (practice_scenario_results.objective_score /
-- objective_max_score, always out of 16 - see packages/scenarios). Stress
-- Lab only has a boolean pass/fail per run, so it is deliberately excluded
-- from leaderboard scoring entirely.
--
-- leaderboard_entries holds one row per (user, scenario): the BEST attempt
-- that user ever submitted for that scenario, never the most recent. A
-- later lower score must never overwrite a prior higher one - the API layer
-- enforces this by reading the existing row before writing (small
-- hackathon-scale dataset, no meaningful concurrent-write race here).
create table if not exists leaderboard_profiles (
  user_id text primary key,
  display_name text not null,
  avatar_url text null,
  leaderboard_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- user_id references leaderboard_profiles (not review_sessions) so the
-- PostgREST embed used by list*Leaderboard() can resolve the relationship.
-- recordBestScore() must therefore create a default (opted-out) profile row
-- before writing an entry for a user who has never touched their profile -
-- scores still exist privately pre-opt-in, per the privacy spec.
create table if not exists leaderboard_entries (
  user_id text not null references leaderboard_profiles (user_id),
  practice_scenario_id text not null,
  attempt_id uuid not null references practice_scenario_attempts (id) on delete cascade,
  objective_score integer not null,
  objective_max_score integer not null,
  normalized_score integer not null,
  achieved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, practice_scenario_id)
);

create index if not exists leaderboard_entries_scenario_score_idx
  on leaderboard_entries (practice_scenario_id, normalized_score desc);
create index if not exists leaderboard_entries_user_idx
  on leaderboard_entries (user_id);

alter table leaderboard_profiles enable row level security;
alter table leaderboard_entries enable row level security;

-- No policies are created for anon/authenticated: with RLS enabled and zero
-- policies, every table denies all access to those roles by default. Only
-- the Supabase secret key (used exclusively by the Express API) bypasses
-- RLS and can read/write these tables.
revoke all on leaderboard_profiles, leaderboard_entries from anon, authenticated;
