import { useAuth } from "@clerk/react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { resolveProtectedRouteAction } from "../lib/auth/routeAuth.js";

export function ProtectedRoute() {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();
  const action = resolveProtectedRouteAction({ isLoaded: Boolean(isLoaded), isSignedIn: Boolean(isSignedIn) });

  if (action === "loading") {
    return (
      <div className="flex min-h-svh items-center justify-center bg-slate-950 text-sm text-slate-400">
        Loading…
      </div>
    );
  }

  if (action === "redirect") {
    return <Navigate to="/sign-in" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
