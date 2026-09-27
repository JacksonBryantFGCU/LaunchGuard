# Purgatory

**Learn to review systems, not just design them.**

Purgatory is a training ground for architecture review skill. Instead of asking
you to design a system from scratch, it drops you into realistic engineering
situations inside an already-built system, and asks you to investigate,
diagnose, decide, and defend your call — the way a senior engineer or
architect actually spends their time. Every response is scored against a
private, hidden "scenario truth," and every architectural decision can be
pressure-tested against a deterministic stress simulator before you commit
to it.

Live deployment: https://launchguard-zeta.vercel.app

## The core loop

Each system (e.g. the Black Friday checkout system) is broken into an ordered
sequence of practice scenarios — incidents like a latency spike, a payment
provider degrading, duplicate checkout requests, or a regional database
failure. For each scenario you:

1. **Situation** — read a realistic incident brief.
2. **Investigate** — inspect the architecture diagram, requirements, evidence
   (metrics, logs), and question an AI "architect" by voice about how the
   system actually behaves.
3. **Decide** — write a diagnosis, an investigation plan, an immediate action,
   an architecture decision, a tradeoff, and a severity rating.
4. **See what happens** — optionally run the scenario through the Stress Lab
   to simulate how your proposed change behaves under load, failure, or
   traffic spikes before you submit.
5. **Progress** — submit and get an objective score against the scenario's
   hidden rubric, then move to the next scenario. Scores roll up to an
   opt-in leaderboard.

The app also retains a legacy "full architecture review" flow (annotate an
entire architecture diagram with redlines and submit a holistic review) from
an earlier iteration of the product; it still works but is no longer the
primary navigation path.

## Why it's hard to game

The scenario truth (root cause, ideal diagnosis, scoring rubric, stress-test
capacity numbers) lives only in server-side "internal" modules
(`packages/scenarios/src/internalRegistry.ts`,
`internalPracticeScenarioRegistry.ts`, `stressLab/engine.ts`) and is never
serialized to the client. The public scenario data the frontend receives
(`registry.ts`, `practiceScenarioRegistry.ts`) is a deliberately-scrubbed
projection — it can describe the architecture and requirements without
revealing what's actually wrong or how a fix will be graded. The "Question
Architect" voice agent is given the same allow-listed context, so it can
answer investigative questions in character without ever leaking the answer.

## Stress Lab

The Stress Lab is a deterministic, from-scratch capacity/latency simulator
(no queueing-theory library — the approximations are documented inline in
`packages/scenarios/src/stressLab/engine.ts`). Given an architecture, a set of
learner-configured modifications (add a cache, a read replica, a connection
pooler, an autoscaling policy, a circuit breaker, a retry policy, a rate
limiter, ...), and a traffic/failure profile, it computes per-frame:

- instance counts vs. demand (with autoscaling cooldown modeled, not instant),
- database connection utilization and a nonlinear latency multiplier,
- checkout p95 latency (including queueing and Little's-Law-driven
  concurrency pressure from slow synchronous dependencies),
- availability (combining DB rejection, dependency errors, and throttling),
- and requirement pass/at-risk/violation status with a **continuous margin**
  (a resilience score), not a binary pass/fail.

Stress runs feed directly into scenario scoring: a scenario's final score
combines the written response against the rubric with the resilience score
from whatever Stress Lab runs the learner performed during investigation.

## Tech stack

**Monorepo:** pnpm workspaces (`pnpm@12.6.0`), TypeScript throughout, ESLint
(flat config) + `typescript-eslint`, Node's built-in test runner (`node:test`
via `tsx --test`) for all backend/domain tests.

**Frontend** (`apps/web`)
- React 19 + React Router 7, built with Vite 8
- Tailwind CSS 4 for styling
- [@xyflow/react](https://reactflow.dev/) for the interactive architecture
  diagram/canvas
- Recharts for Stress Lab time-series charts
- [Clerk](https://clerk.com/) (`@clerk/react`) for authentication
- [ElevenLabs](https://elevenlabs.io/) Conversational AI (`@elevenlabs/react`)
  for the voice-based "Question Architect" feature
- Zod for shared runtime validation

**Backend** (`apps/api`)
- Express 5 on Node, run via `tsx` in dev
- `@clerk/express` for auth middleware (JWT verification)
- [Supabase](https://supabase.com/) (`@supabase/supabase-js`, Postgres) for
  persistence, accessed with the modern secret key (not the legacy
  `service_role` key), with row-level security enabled on every table
- `helmet`, `cors`, `pino`/`pino-http` for security headers, CORS, and
  structured logging
- ElevenLabs REST API for issuing signed voice-session URLs

**Domain packages**
- `packages/shared` — Zod schemas and shared types (architecture domain,
  review sessions/submissions, practice scenario attempts, Stress Lab
  parameters, leaderboard, voice sessions, conversation transcripts) used by
  both the API and the frontend
- `packages/scenarios` — the scenario content and grading engine: public
  scenario/practice-scenario registries, the private "internal" registries
  holding hidden scenario truth, the scenario evaluator (written-response
  scoring), and the Stress Lab simulation engine (capacity/latency/
  autoscaling/circuit-breaker/retry/throttle models plus the resilience
  scorer)

**Data model** (Supabase/Postgres, see `supabase/migrations/`)
- Legacy review flow: `review_sessions`, `review_redlines`,
  `voice_transcript_turns`, `review_submissions`, `stress_test_progress`,
  `review_results`
- Practice scenarios: `practice_scenario_attempts`,
  `practice_scenario_responses`, `practice_scenario_response_requirements`,
  `practice_scenario_evidence`, `practice_scenario_response_evidence`,
  `practice_scenario_results`
- Stress Lab: `stress_simulation_runs`
- Leaderboard: `leaderboard_profiles`, `leaderboard_entries`

**Deployment**
- Hosted on Vercel as a single project. `vercel.json` points the build at
  `scripts/build-vercel-output.mjs`, which builds the Vite frontend, bundles
  `apps/api/src/vercelHandler.ts` into one self-contained ESM function with
  `esbuild` (avoiding Vercel's zero-config `/api` detection and any need for
  `tsx`/workspace `node_modules` at runtime), and writes a Vercel Build
  Output API v3 manifest directly — the frontend is served as static assets,
  `/health` and `/api/*` route to the bundled function, and everything else
  falls back to `index.html` for client-side routing.

## Project structure

```
apps/
  web/    React SPA (routes, pages, features, components)
  api/    Express API (routes, services, Supabase repositories, config)
packages/
  shared/     Cross-cutting Zod schemas + types
  scenarios/  Scenario content, private grading truth, Stress Lab engine
supabase/
  migrations/ SQL migrations for every table above
scripts/
  build-vercel-output.mjs  Custom Vercel Build Output API build
```

## Running locally

Requires Node and `pnpm@12.6.0` (see `packageManager` in `package.json`;
`corepack enable` will pick it up automatically).

```bash
pnpm install

# Copy env templates and fill in real keys (see below)
cp .env.example .env.local
cp apps/api/.env.example apps/api/.env.local

pnpm dev          # runs both apps/web (Vite) and apps/api (tsx watch) in parallel
# or individually:
pnpm dev:web
pnpm dev:api
```

The web app defaults to `http://localhost:5173` (Vite will pick the next free
port if it's taken) and the API to `http://localhost:3001`.

### Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `NODE_ENV` | api | `development` / `test` / `production` |
| `API_PORT` | api | Port the Express server listens on (default `3001`) |
| `WEB_ORIGIN` | api | Allowed CORS origin for the frontend |
| `VITE_API_URL` | web | Base URL the frontend calls for the API |
| `ELEVENLABS_API_KEY` | api only | Server-only ElevenLabs key for issuing signed voice-session URLs — never expose to the browser |
| `ELEVENLABS_AGENT_ID` | api | ID of the ElevenLabs ConvAI agent configured as Purgatory's architect persona |
| `CLERK_PUBLISHABLE_KEY` / `VITE_CLERK_PUBLISHABLE_KEY` | api / web | Public Clerk key |
| `CLERK_SECRET_KEY` | api only | Server-only Clerk key for verifying sessions |
| `SUPABASE_URL` | api | Supabase project URL |
| `SUPABASE_SECRET_KEY` | api only | Supabase secret key (`sb_secret_...`), not the legacy `service_role` key |

Voice sessions degrade gracefully (503 `VOICE_NOT_CONFIGURED`) if the
ElevenLabs variables are unset, so the rest of the app is usable without
them.

### Database

Schema lives in `supabase/migrations/`. With the Supabase CLI linked to a
project, apply them with:

```bash
supabase db push
```

## Verification

```bash
pnpm typecheck   # tsc across every workspace package
pnpm lint        # eslint across api/shared/scenarios + web
pnpm build       # production build of every package
pnpm test        # node:test suites across api/shared/scenarios
```
