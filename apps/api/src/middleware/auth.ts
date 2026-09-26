import type { NextFunction, Request, Response } from "express";
import { getAuth } from "@clerk/express";

export type GetAuthFn = (req: Request) => { userId: string | null };

export interface AuthedRequest extends Request {
  userId?: string;
}

// Injectable so tests can supply a fake verified-user-id resolver without
// clerkMiddleware/Clerk's network or JWKS - mirrors the VoiceSessionDeps
// pattern already used in this codebase. Attaches the verified id to the
// request so downstream handlers never re-derive it from a different source.
export function createRequireAuth(getAuthFn: GetAuthFn = getAuth) {
  return function requireAuth(req: Request, res: Response, next: NextFunction): void {
    const auth = getAuthFn(req);
    if (!auth.userId) {
      res.status(401).json({ error: "unauthorized", message: "Sign in required." });
      return;
    }
    (req as AuthedRequest).userId = auth.userId;
    next();
  };
}

export const requireAuth = createRequireAuth();

// Only ever called downstream of requireAuth, so userId is always set.
export function getUserId(req: Request): string {
  const userId = (req as AuthedRequest).userId;
  if (!userId) {
    throw new Error("getUserId() called without requireAuth in the middleware chain");
  }
  return userId;
}
