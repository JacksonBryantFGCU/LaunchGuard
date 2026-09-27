export interface QueueBacklogResult {
  backlog: number;
  estimatedDelaySeconds: number;
}

// Queue-based load leveling (spec #11/#23): backlog accumulates whenever
// arrival exceeds consumer throughput, drains when throughput exceeds
// arrival, and can never go negative. Estimated processing delay is how
// long a message added right now would wait behind the current backlog.
export function stepQueueBacklog(
  previousBacklog: number,
  arrivalRatePerSecond: number,
  consumerThroughputPerSecond: number,
  stepSeconds: number,
): QueueBacklogResult {
  const backlog = Math.max(0, previousBacklog + (arrivalRatePerSecond - consumerThroughputPerSecond) * stepSeconds);
  const estimatedDelaySeconds = consumerThroughputPerSecond > 0 ? backlog / consumerThroughputPerSecond : Infinity;
  return { backlog, estimatedDelaySeconds };
}
