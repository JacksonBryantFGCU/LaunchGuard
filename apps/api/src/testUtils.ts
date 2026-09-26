import type { Server } from "node:http";
import { createApp } from "./app.js";
import { createRequireAuth } from "./middleware/auth.js";
import { InMemoryReviewRepository, type ReviewRepository } from "./services/reviewRepository.js";

export const TEST_USER_ID = "user_test_default";

export interface WithTestServerOptions {
  // Defaults to a fixed signed-in test user so existing route tests don't
  // need to know about auth. Pass null to exercise the signed-out path.
  userId?: string | null;
  // Defaults to a fresh repository per call. Pass a shared instance when a
  // test needs continuity across more than one withTestServer call.
  repository?: ReviewRepository;
}

export async function withTestServer<T>(
  fn: (baseUrl: string) => Promise<T>,
  options: WithTestServerOptions = {},
): Promise<T> {
  const userId = options.userId === undefined ? TEST_USER_ID : options.userId;
  const repository = options.repository ?? new InMemoryReviewRepository();
  const app = createApp({ requireAuth: createRequireAuth(() => ({ userId })), repository });
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

  const address = server.address();
  if (typeof address !== "object" || address === null) {
    throw new Error("failed to determine test server address");
  }

  try {
    return await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve) => server.close(() => resolve(undefined)));
  }
}
