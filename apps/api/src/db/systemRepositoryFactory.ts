import { env } from "../config/env.js";
import { InMemorySystemRepository, type SystemRepository } from "../services/systemRepository.js";
import { SupabaseSystemRepository } from "./supabaseSystemRepository.js";
import { createSupabaseClient } from "./supabase.js";

// Mirrors createDefaultReviewRepository - tests never call this, they
// always inject an InMemorySystemRepository directly via createApp({ systemRepository }).
export function createDefaultSystemRepository(): SystemRepository {
  if (env.SUPABASE_URL && env.SUPABASE_SECRET_KEY) {
    return new SupabaseSystemRepository(createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY));
  }

  if (env.NODE_ENV === "production") {
    throw new Error(
      "Supabase persistence is required in production but SUPABASE_URL/SUPABASE_SECRET_KEY are not configured.",
    );
  }

  console.warn(
    "[purgatory-api] SUPABASE_URL/SUPABASE_SECRET_KEY are not set - falling back to an in-memory system repository. System data will not persist across restarts.",
  );
  return new InMemorySystemRepository();
}
