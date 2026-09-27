import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// createClient() wants the bare project URL and appends "/rest/v1/..."
// itself. Supabase's dashboard also shows the Data API URL, which already
// ends in "/rest/v1/" - pasting that in by mistake doubles the path and
// PostgREST rejects it (PGRST125, "Invalid path specified in request
// URL"). Strip it (and any trailing slash) so either paste works.
export function normalizeSupabaseUrl(url: string): string {
  return url.trim().replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
}

// Server-only. This client is created from the Supabase secret key, which
// bypasses Row Level Security - never send this client, or anything built
// from it, to the browser.
export function createSupabaseClient(url: string, secretKey: string): SupabaseClient {
  if (!url || !secretKey) {
    throw new Error("createSupabaseClient requires both a URL and a secret key.");
  }
  return createClient(normalizeSupabaseUrl(url), secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
