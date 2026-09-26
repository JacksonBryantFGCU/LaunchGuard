export const oldContent = "";

export const newContent = `export const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1000;

export function shouldRetry(_error: unknown): boolean {
  // Any failure from the payment provider is treated as retryable.
  return true;
}

export function nextBackoffMs(attempt: number): number {
  return BASE_DELAY_MS * (attempt + 1);
}
`;
