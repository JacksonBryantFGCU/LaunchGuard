import { useEffect } from "react";
import { useAuth } from "@clerk/react";
import { setAuthTokenGetter } from "../lib/api/client.js";

// Registers Clerk's getToken() once at the app root so the API client can
// attach a bearer token to authenticated requests without any page fetching
// its own token.
export function AuthTokenBridge() {
  const { getToken } = useAuth();

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken]);

  return null;
}
