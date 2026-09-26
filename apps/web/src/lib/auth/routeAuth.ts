export interface AuthLoadState {
  isLoaded: boolean;
  isSignedIn: boolean;
}

export type ProtectedRouteAction = "loading" | "redirect" | "allow";

// Pure decision so the auth boundary is unit-testable without rendering
// Clerk's React tree.
export function resolveProtectedRouteAction(state: AuthLoadState): ProtectedRouteAction {
  if (!state.isLoaded) return "loading";
  return state.isSignedIn ? "allow" : "redirect";
}
