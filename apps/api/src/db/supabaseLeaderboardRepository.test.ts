import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { SupabaseLeaderboardRepository } from "./supabaseLeaderboardRepository.js";

// A minimal fake PostgREST backend, in-memory only. It supports exactly the
// operations SupabaseLeaderboardRepository issues (plain eq/in filters,
// order, and upsert with onConflict/ignoreDuplicates/return=representation)
// against two tables that mirror the leaderboard_profiles/leaderboard_entries
// migration.
//
// `relationshipEmbeddingAvailable: false` reproduces a real, common Supabase
// failure mode: PostgREST's schema cache has not (yet, or ever) resolved the
// leaderboard_entries -> leaderboard_profiles foreign-key relationship (e.g.
// a migration applied outside the normal CLI flow, or a cache that hasn't
// reloaded), which makes any `!inner` embedded-resource select fail with
// PGRST200 - "Could not find a relationship ... in the schema cache" - even
// though both tables exist and are otherwise queryable.
interface FakeState {
  profiles: Map<string, Record<string, unknown>>;
  entries: Map<string, Record<string, unknown>>;
  relationshipEmbeddingAvailable: boolean;
}

function createFakeState(relationshipEmbeddingAvailable = true): FakeState {
  return { profiles: new Map(), entries: new Map(), relationshipEmbeddingAvailable };
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function parseFilterValue(raw: string): { op: "eq" | "in"; value: string | string[] } {
  if (raw.startsWith("eq.")) return { op: "eq", value: raw.slice(3) };
  if (raw.startsWith("in.")) return { op: "in", value: raw.slice(3).replace(/^\(|\)$/g, "").split(",").filter(Boolean) };
  throw new Error(`Unsupported filter in test fake: ${raw}`);
}

function headerValue(headers: RequestInit["headers"], name: string): string {
  return new Headers(headers).get(name) ?? "";
}

function createFakeFetch(state: FakeState): typeof fetch {
  return (async (url: string | URL, opts?: RequestInit) => {
    const u = new URL(url.toString());
    const table = u.pathname.replace("/rest/v1/", "");
    const store = table === "leaderboard_profiles" ? state.profiles : state.entries;
    const method = opts?.method ?? "GET";

    if (method === "GET") {
      const select = u.searchParams.get("select") ?? "*";
      if (select.includes("!inner")) {
        if (!state.relationshipEmbeddingAvailable) {
          return jsonResponse(
            {
              code: "PGRST200",
              message:
                "Could not find a relationship between 'leaderboard_entries' and 'leaderboard_profiles' in the schema cache",
              details: null,
              hint: null,
            },
            400,
          );
        }
        throw new Error("test fake does not implement a working embed path - the fix should never need one");
      }

      let rows = [...store.values()];
      for (const [key, raw] of u.searchParams) {
        if (["select", "order", "limit", "offset"].includes(key)) continue;
        const { op, value } = parseFilterValue(raw);
        rows = rows.filter((row) => (op === "eq" ? String(row[key]) === value : (value as string[]).includes(String(row[key]))));
      }
      const order = u.searchParams.get("order");
      if (order) {
        const [col, dir] = order.split(".");
        rows = [...rows].sort((a, b) => (dir === "desc" ? 1 : -1) * ((a[col] as number) - (b[col] as number)));
      }
      const cols = select === "*" ? null : select.split(",").map((c) => c.trim());
      const projected = cols ? rows.map((r) => Object.fromEntries(cols.map((c) => [c, r[c]]))) : rows;
      return jsonResponse(projected, 200);
    }

    if (method === "POST") {
      const body = JSON.parse((opts?.body as string) ?? "{}") as Record<string, unknown>;
      const prefer = headerValue(opts?.headers, "prefer");
      const onConflictCols = (u.searchParams.get("on_conflict") ?? "").split(",").filter(Boolean);
      const key = onConflictCols.length ? onConflictCols.map((c) => body[c]).join("::") : JSON.stringify(body);
      const existing = store.get(key);

      if (existing && /ignore-duplicates/.test(prefer)) {
        // no-op, matches ON CONFLICT DO NOTHING
      } else {
        store.set(key, { ...existing, ...body });
      }

      const returning = /return=representation/.test(prefer);
      return jsonResponse(returning ? [store.get(key)] : [], 201);
    }

    throw new Error(`Unsupported method in test fake: ${method}`);
  }) as typeof fetch;
}

function repoWith(state: FakeState): SupabaseLeaderboardRepository {
  const client = createClient("http://fake.local", "fake-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: createFakeFetch(state) },
  });
  return new SupabaseLeaderboardRepository(client);
}

test("listScenarioLeaderboard returns an empty list when nobody has opted in (no rows, not a 500)", async () => {
  const repo = repoWith(createFakeState());
  const result = await repo.listScenarioLeaderboard("checkout-latency-spike");
  assert.deepEqual(result, []);
});

test("listOverallLeaderboard returns an empty list when there are zero entries", async () => {
  const repo = repoWith(createFakeState());
  const result = await repo.listOverallLeaderboard();
  assert.deepEqual(result, []);
});

test("getProfile returns undefined for a signed-in user who has never touched their leaderboard profile", async () => {
  const repo = repoWith(createFakeState());
  const result = await repo.getProfile("user_a");
  assert.equal(result, undefined);
});

test("recordBestScore creates a default opted-out profile row for a user who never called upsertProfile", async () => {
  const state = createFakeState();
  const repo = repoWith(state);
  await repo.recordBestScore({
    userId: "user_a",
    practiceScenarioId: "checkout-latency-spike",
    attemptId: "attempt-1",
    objectiveScore: 12,
    objectiveMaxScore: 16,
    normalizedScore: 75,
  });
  const profile = await repo.getProfile("user_a");
  assert.ok(profile);
  assert.equal(profile?.optedIn, false);
});

test("a non-opted-in user with the highest score is excluded from both leaderboards, and ties share rank via equal scores", async () => {
  const state = createFakeState();
  const repo = repoWith(state);

  await repo.upsertProfile("user_a", { displayName: "Alice", optedIn: true });
  await repo.upsertProfile("user_b", { displayName: "Bob", optedIn: true });
  await repo.upsertProfile("user_c", { displayName: "Cara", optedIn: false });

  await repo.recordBestScore({
    userId: "user_a",
    practiceScenarioId: "checkout-latency-spike",
    attemptId: "a1",
    objectiveScore: 12,
    objectiveMaxScore: 16,
    normalizedScore: 75,
  });
  await repo.recordBestScore({
    userId: "user_b",
    practiceScenarioId: "checkout-latency-spike",
    attemptId: "a2",
    objectiveScore: 12,
    objectiveMaxScore: 16,
    normalizedScore: 75,
  });
  await repo.recordBestScore({
    userId: "user_c",
    practiceScenarioId: "checkout-latency-spike",
    attemptId: "a3",
    objectiveScore: 16,
    objectiveMaxScore: 16,
    normalizedScore: 100,
  });

  const board = await repo.listScenarioLeaderboard("checkout-latency-spike");
  assert.equal(board.length, 2);
  assert.ok(board.every((row) => row.userId !== "user_c"));
  assert.deepEqual(
    board.map((r) => r.normalizedScore).sort(),
    [75, 75],
  );

  const overall = await repo.listOverallLeaderboard();
  assert.equal(overall.length, 2);
});

test("the leaderboard reads never depend on PostgREST's relationship-embedding feature (must not 500 when the schema cache has not resolved the leaderboard_entries -> leaderboard_profiles relationship)", async () => {
  const state = createFakeState(/* relationshipEmbeddingAvailable */ false);
  const repo = repoWith(state);

  await repo.upsertProfile("user_a", { displayName: "Alice", optedIn: true });
  await repo.recordBestScore({
    userId: "user_a",
    practiceScenarioId: "checkout-latency-spike",
    attemptId: "a1",
    objectiveScore: 12,
    objectiveMaxScore: 16,
    normalizedScore: 75,
  });

  const board = await repo.listScenarioLeaderboard("checkout-latency-spike");
  assert.equal(board.length, 1);
  assert.equal(board[0]?.normalizedScore, 75);

  const overall = await repo.listOverallLeaderboard();
  assert.equal(overall.length, 1);
});
