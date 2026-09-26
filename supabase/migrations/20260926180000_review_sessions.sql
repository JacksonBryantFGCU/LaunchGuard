-- Redline durable persistence foundation.
--
-- Clerk remains the source of truth for identity (email, OAuth, avatar,
-- authentication). These tables only ever store the verified Clerk user id
-- as plain text (review_sessions.user_id) - there is deliberately no
-- Redline "users" table mirroring Clerk.
--
-- All access goes through the Express API using the Supabase secret key,
-- which bypasses Row Level Security entirely. RLS is enabled below anyway
-- as defense in depth and to keep the anon/authenticated Postgres roles
-- (used by Supabase's browser Data API) from reading or writing anything,
-- since this phase never queries Supabase from the browser. If a future
-- phase adds direct browser access, it should do so via Clerk's Supabase
-- third-party auth integration plus real per-user RLS policies - not by
-- loosening these grants.

create table if not exists review_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  scenario_slug text not null,

  status text not null default 'draft' check (status in ('draft', 'submitted')),

  reviewed_node_ids text[] not null default '{}',
  reviewed_edge_ids text[] not null default '{}',

  reviewer_notes text not null default '',

  started_at timestamptz not null default now(),
  submitted_at timestamptz null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists review_sessions_user_id_idx on review_sessions (user_id);
create index if not exists review_sessions_user_id_created_at_idx on review_sessions (user_id, created_at desc);

create table if not exists review_redlines (
  id uuid primary key,
  review_session_id uuid not null references review_sessions (id) on delete cascade,

  target_type text not null check (target_type in ('node', 'edge')),
  target_id text not null,

  category text not null,
  severity text not null check (severity in ('critical', 'high', 'medium', 'low')),

  title text not null,
  reasoning text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists review_redlines_review_session_id_idx on review_redlines (review_session_id);

create table if not exists voice_transcript_turns (
  id uuid primary key default gen_random_uuid(),
  review_session_id uuid not null references review_sessions (id) on delete cascade,

  conversation_id text not null,
  -- The Redline-normalized turn id (see transcriptNormalization.ts) - not a
  -- uuid, so it is kept separate from this row's own primary key and used
  -- only to de-duplicate repeated persistence of the same turn.
  turn_id text not null,

  speaker text not null check (speaker in ('reviewer', 'architect')),
  text text not null,
  turn_order integer not null,
  occurred_at timestamptz not null,

  created_at timestamptz not null default now(),

  unique (review_session_id, turn_id)
);

create index if not exists voice_transcript_turns_session_order_idx on voice_transcript_turns (review_session_id, turn_order);

create table if not exists review_submissions (
  id uuid primary key default gen_random_uuid(),
  review_session_id uuid not null unique references review_sessions (id) on delete cascade,

  recommendation text not null check (
    recommendation in ('approve', 'approve_with_conditions', 'request_redesign', 'block_release')
  ),
  final_rationale text not null,
  submitted_at timestamptz not null,

  created_at timestamptz not null default now()
);

create table if not exists stress_test_progress (
  id uuid primary key default gen_random_uuid(),
  review_session_id uuid not null references review_sessions (id) on delete cascade,

  stress_test_id text not null,
  status text not null check (status in ('not_started', 'running', 'passed', 'failed')),
  current_step integer not null default 0,
  completed_at timestamptz null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (review_session_id, stress_test_id)
);

create index if not exists stress_test_progress_review_session_id_idx on stress_test_progress (review_session_id);

-- Preparation for evaluation. Storage only - no scoring logic lives here or
-- is implied by this schema; a later phase decides how these get filled.
create table if not exists review_results (
  id uuid primary key default gen_random_uuid(),
  review_session_id uuid not null unique references review_sessions (id) on delete cascade,

  objective_score numeric null,
  objective_max_score numeric null,
  qualitative_score numeric null,
  final_score numeric null,

  result_data jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table review_sessions enable row level security;
alter table review_redlines enable row level security;
alter table voice_transcript_turns enable row level security;
alter table review_submissions enable row level security;
alter table stress_test_progress enable row level security;
alter table review_results enable row level security;

-- No policies are created for anon/authenticated: with RLS enabled and zero
-- policies, every table denies all access to those roles by default. Only
-- the Supabase secret key (used exclusively by the Express API) bypasses
-- RLS and can read/write these tables.
revoke all on review_sessions, review_redlines, voice_transcript_turns, review_submissions, stress_test_progress, review_results
  from anon, authenticated;
