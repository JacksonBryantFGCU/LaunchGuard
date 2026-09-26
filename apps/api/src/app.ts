import express from "express";
import helmet from "helmet";
import cors from "cors";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./logger.js";
import { healthRouter } from "./routes/health.js";
import { scansRouter } from "./routes/scans.js";
import { errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.WEB_ORIGIN }));
  app.use(express.json({ limit: "100kb" }));
  app.use(pinoHttp({ logger, redact: ["req.headers.authorization", "req.headers.cookie"] }));

  app.use("/health", healthRouter);
  app.use("/api/scans", scansRouter);

  app.use(errorHandler);

  return app;
}
