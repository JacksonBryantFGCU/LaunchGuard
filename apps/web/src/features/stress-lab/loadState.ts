export type StressLabAvailability = "ready" | "unsupported";

// Distinguishes "this scenario intentionally has no Stress Lab test yet"
// (a defined-but-empty API response) from an API/network failure, which is
// handled separately by the fetch's catch block (spec #10) - never uses
// the unsupported copy for an error.
export function classifyStressLabAvailability(testDefinitionCount: number): StressLabAvailability {
  return testDefinitionCount > 0 ? "ready" : "unsupported";
}
