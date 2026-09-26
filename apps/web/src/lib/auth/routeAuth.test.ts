import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveProtectedRouteAction } from "./routeAuth.js";

test("still loading auth state shows loading, not a redirect", () => {
  assert.equal(resolveProtectedRouteAction({ isLoaded: false, isSignedIn: false }), "loading");
});

test("loaded and signed out redirects to sign-in", () => {
  assert.equal(resolveProtectedRouteAction({ isLoaded: true, isSignedIn: false }), "redirect");
});

test("loaded and signed in allows the route", () => {
  assert.equal(resolveProtectedRouteAction({ isLoaded: true, isSignedIn: true }), "allow");
});
