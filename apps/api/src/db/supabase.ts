import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only. This client is created from the Supabase secret key, which
// bypasses Row Level Security - never send this client, or anything built
// from it, to the browser.
export function createSupabaseClient(url: string, secretKey: string): SupabaseClient {
  if (!url || !secretKey) {
    throw new Error("createSupabaseClient requires both a URL and a secret key.");
  }
  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
