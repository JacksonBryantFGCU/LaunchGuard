import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeSupabaseUrl } from "./supabase.js";

test("passes through a bare project URL unchanged", () => {
  assert.equal(normalizeSupabaseUrl("https://abcdef.supabase.co"), "https://abcdef.supabase.co");
});

test("strips a trailing slash", () => {
  assert.equal(normalizeSupabaseUrl("https://abcdef.supabase.co/"), "https://abcdef.supabase.co");
});

test("strips an accidentally-pasted /rest/v1 Data API suffix", () => {
  assert.equal(normalizeSupabaseUrl("https://abcdef.supabase.co/rest/v1"), "https://abcdef.supabase.co");
});

test("strips an accidentally-pasted /rest/v1/ Data API suffix with trailing slash", () => {
  assert.equal(normalizeSupabaseUrl("https://abcdef.supabase.co/rest/v1/"), "https://abcdef.supabase.co");
});
