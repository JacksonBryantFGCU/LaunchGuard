import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  req.log.error(err);
  const message = env.NODE_ENV === "production" ? "Something went wrong" : String(err instanceof Error ? err.message : err);
  res.status(500).json({ error: "internal_error", message });
}
