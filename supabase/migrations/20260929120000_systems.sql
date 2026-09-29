-- Generic System domain foundation (Systems Phase 1).
--
-- Sample systems (e.g. Black Friday Checkout) are code-authored, not rows
-- here - see packages/scenarios/src/sampleSystems.ts. This table only ever
-- holds user-created manual systems, so ownership is always a real Clerk
-- user id and there is no null-owner row to guard against.
--
-- Same access model as review_sessions: RLS enabled with no policies, so
-- only the Express API's Supabase secret key (which bypasses RLS) can read
-- or write. No direct browser access.

create table if not exists systems (
  id uuid primary key default gen_random_uuid(),
  owner_user_id text not null,

  name text not null,
  slug text not null,
  description text null,

  source_type text not null default 'manual' check (source_type in ('manual')),
  visibility text not null default 'private' check (visibility in ('private', 'public')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists systems_owner_user_id_idx on systems (owner_user_id);
create index if not exists systems_owner_user_id_created_at_idx on systems (owner_user_id, created_at desc);

-- Scoped to the owner, not global: two different users may reasonably name
-- their own systems the same thing.
create unique index if not exists systems_owner_user_id_slug_idx on systems (owner_user_id, slug);

alter table systems enable row level security;
revoke all on systems from anon, authenticated;
