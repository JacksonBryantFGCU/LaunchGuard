// Pure so a missing key fails fast and clearly at startup instead of as a
// mysterious runtime error deep inside Clerk's React tree.
export function resolvePublishableKey(key: string | undefined): string {
  if (!key) {
    throw new Error(
      "Missing VITE_CLERK_PUBLISHABLE_KEY. Set it in apps/web's env (see .env.example) to a publishable key from the Clerk Dashboard.",
    );
  }
  return key;
}
