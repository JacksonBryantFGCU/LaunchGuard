import { env } from "../config/env.js";
import { InMemoryReviewRepository, type ReviewRepository } from "../services/reviewRepository.js";
import { SupabaseReviewRepository } from "./supabaseReviewRepository.js";
import { createSupabaseClient } from "./supabase.js";

// The one place that decides which ReviewRepository backs the running
// server. Tests never call this - they always inject an
// InMemoryReviewRepository directly via createApp({ repository }).
export function createDefaultReviewRepository(): ReviewRepository {
  if (env.SUPABASE_URL && env.SUPABASE_SECRET_KEY) {
    return new SupabaseReviewRepository(createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY));
  }

  if (env.NODE_ENV === "production") {
    throw new Error(
      "Supabase persistence is required in production but SUPABASE_URL/SUPABASE_SECRET_KEY are not configured.",
    );
  }

  console.warn(
    "[purgatory-api] SUPABASE_URL/SUPABASE_SECRET_KEY are not set - falling back to an in-memory review repository. Review data will not persist across restarts.",
  );
  return new InMemoryReviewRepository();
}
