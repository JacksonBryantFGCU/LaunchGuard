import { env } from "../config/env.js";
import { InMemoryLeaderboardRepository, type LeaderboardRepository } from "../services/leaderboardRepository.js";
import { SupabaseLeaderboardRepository } from "./supabaseLeaderboardRepository.js";
import { createSupabaseClient } from "./supabase.js";

// Mirrors practiceScenarioRepositoryFactory.ts - same env check, same
// in-memory fallback outside production, same hard failure in production.
export function createDefaultLeaderboardRepository(): LeaderboardRepository {
  if (env.SUPABASE_URL && env.SUPABASE_SECRET_KEY) {
    return new SupabaseLeaderboardRepository(createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY));
  }

  if (env.NODE_ENV === "production") {
    throw new Error(
      "Supabase persistence is required in production but SUPABASE_URL/SUPABASE_SECRET_KEY are not configured.",
    );
  }

  console.warn(
    "[redline-api] SUPABASE_URL/SUPABASE_SECRET_KEY are not set - falling back to an in-memory leaderboard repository. Leaderboard data will not persist across restarts.",
  );
  return new InMemoryLeaderboardRepository();
}
