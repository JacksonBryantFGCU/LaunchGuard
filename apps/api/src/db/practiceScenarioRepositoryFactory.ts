import { env } from "../config/env.js";
import { InMemoryPracticeScenarioRepository, type PracticeScenarioRepository } from "../services/practiceScenarioRepository.js";
import { SupabasePracticeScenarioRepository } from "./supabasePracticeScenarioRepository.js";
import { createSupabaseClient } from "./supabase.js";

// Mirrors reviewRepositoryFactory.ts - same env check, same in-memory
// fallback outside production, same hard failure in production.
export function createDefaultPracticeScenarioRepository(): PracticeScenarioRepository {
  if (env.SUPABASE_URL && env.SUPABASE_SECRET_KEY) {
    return new SupabasePracticeScenarioRepository(createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY));
  }

  if (env.NODE_ENV === "production") {
    throw new Error(
      "Supabase persistence is required in production but SUPABASE_URL/SUPABASE_SECRET_KEY are not configured.",
    );
  }

  console.warn(
    "[purgatory-api] SUPABASE_URL/SUPABASE_SECRET_KEY are not set - falling back to an in-memory practice scenario repository. Practice data will not persist across restarts.",
  );
  return new InMemoryPracticeScenarioRepository();
}
