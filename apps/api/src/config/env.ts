import { fileURLToPath } from "node:url";
import { z } from "zod";
import { loadLocalEnvFiles, effectiveNodeEnv } from "./loadEnv.js";

// This file lives at apps/api/src/config/env.ts, so ../.. is the apps/api
// package root - robust regardless of the process's cwd, though pnpm's
// dev/dev:api scripts already run with cwd set there too.
const apiRoot = fileURLToPath(new URL("../..", import.meta.url));
loadLocalEnvFiles(apiRoot, effectiveNodeEnv());

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(3001),
  WEB_ORIGIN: z.url().default("http://localhost:5173"),
  ELEVENLABS_API_KEY: z.string().min(1).optional(),
  ELEVENLABS_AGENT_ID: z.string().min(1).optional(),
  CLERK_PUBLISHABLE_KEY: z.string().min(1).optional(),
  CLERK_SECRET_KEY: z.string().min(1).optional(),
  SUPABASE_URL: z.string().min(1).optional(),
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
});

export const env = EnvSchema.parse(process.env);
export type Env = typeof env;
