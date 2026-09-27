import express, { type RequestHandler } from "express";
import helmet from "helmet";
import cors from "cors";
import { pinoHttp } from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { env } from "./config/env.js";
import { logger } from "./logger.js";
import { healthRouter } from "./routes/health.js";
import { scenariosRouter } from "./routes/scenarios.js";
import { createReviewsRouter } from "./routes/reviews.js";
import { createReviewSessionsRouter } from "./routes/reviewSessions.js";
import { voiceRouter } from "./routes/voice.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requireAuth as defaultRequireAuth } from "./middleware/auth.js";
import { createDefaultReviewRepository } from "./db/reviewRepositoryFactory.js";
import { createDefaultPracticeScenarioRepository } from "./db/practiceScenarioRepositoryFactory.js";
import type { ReviewRepository } from "./services/reviewRepository.js";
import type { PracticeScenarioRepository } from "./services/practiceScenarioRepository.js";
import { practiceScenariosRouter } from "./routes/practiceScenarios.js";
import { createPracticeScenarioAttemptsRouter } from "./routes/practiceScenarioAttempts.js";

export interface CreateAppOverrides {
  // Test-only seam: replaces requireAuth so tests never depend on Clerk's
  // network/JWKS. Production always uses the real requireAuth.
  requireAuth?: RequestHandler;
  // Test-only seam: replaces the review repository so tests never depend on
  // a live Supabase project. Production always uses createDefaultReviewRepository().
  repository?: ReviewRepository;
  // Test-only seam: same idea as `repository`, for practice scenario persistence.
  practiceRepository?: PracticeScenarioRepository;
}

export function createApp(overrides: CreateAppOverrides = {}) {
  const app = express();
  const requireAuth = overrides.requireAuth ?? defaultRequireAuth;
  const repository = overrides.repository ?? createDefaultReviewRepository();
  const practiceRepository = overrides.practiceRepository ?? createDefaultPracticeScenarioRepository();

  app.use(helmet());
  app.use(cors({ origin: env.WEB_ORIGIN }));
  app.use(express.json({ limit: "100kb" }));
  app.use(pinoHttp({ logger, redact: ["req.headers.authorization", "req.headers.cookie"] }));
  // Only mount the real Clerk middleware when using the real requireAuth -
  // tests inject a fake requireAuth and never need Clerk's keys/JWKS.
  if (!overrides.requireAuth) {
    app.use(clerkMiddleware());
  }

  app.use("/health", healthRouter);
  app.use("/api/scenarios", scenariosRouter);
  app.use("/api/practice-scenarios", practiceScenariosRouter);
  app.use("/api/review-sessions", requireAuth, createReviewSessionsRouter(repository));
  app.use(
    "/api/review-sessions/:reviewSessionId/practice-scenarios",
    requireAuth,
    createPracticeScenarioAttemptsRouter(repository, practiceRepository),
  );
  app.use("/api/reviews", requireAuth, createReviewsRouter(repository, practiceRepository));
  app.use("/api/voice", requireAuth, voiceRouter);

  app.use(errorHandler);

  return app;
}
