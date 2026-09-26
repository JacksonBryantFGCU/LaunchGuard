import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { RepositoryScanError } from "../errors.js";

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof RepositoryScanError) {
    req.log.warn({ code: err.code }, "repository scan rejected");
    res.status(err.status).json({ error: err.code, message: err.message });
    return;
  }

  req.log.error(err);
  const message = env.NODE_ENV === "production" ? "Something went wrong" : String(err instanceof Error ? err.message : err);
  res.status(500).json({ error: "internal_error", message });
}
