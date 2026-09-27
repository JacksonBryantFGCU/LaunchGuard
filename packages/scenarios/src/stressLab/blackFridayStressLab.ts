import type { InterventionDefinition, StressProfile } from "@purgatory/shared";
import type { ComponentSimulationProfile, DatabaseSimulationProfile, RequirementTarget } from "./engine.js";
import type { StressTimelineTestInput } from "./timeline.js";

// Reference lab (spec #36): Black Friday Capacity Surge. Reuses this
// scenario's existing authored truth - the stress-10x-spike fixture's
// 32,000 req/min flash-sale projection (packages/scenarios/src/black-friday-checkout/internal.ts)
// and the 500-connection Postgres ceiling (ev-db-connections) - rather than
// inventing new numbers. Capacity/connection figures below are the private
// formulas that produce that fixture's outcome; never export these two
// constants to the frontend.

export const blackFridayComponentProfiles: ComponentSimulationProfile[] = [
  { nodeId: "checkout-service", baselineInstances: 3, capacityPerInstanceRpm: 4000, connectionsPerInstance: 35 },
  { nodeId: "inventory-service", baselineInstances: 3, capacityPerInstanceRpm: 4000, connectionsPerInstance: 35, readFraction: 0.5 },
];

export const blackFridayDatabaseProfile: DatabaseSimulationProfile = { nodeId: "postgres", maxConnections: 500, baseLatencyMs: 150 };

const throughputAndLatencyTargets: RequirementTarget[] = [
  { requirementId: "req-throughput", area: "throughput" },
  { requirementId: "req-latency", area: "latency", targetMs: 800 },
];

// Five initial stress-test definitions (spec #4) for Black Friday Checkout.
// Each is its own StressProfile (own parameters, own simulated-time window)
// rather than one profile reused across tests, so the frontend can offer a
// dedicated form and timeline per test without a client-side switch on
// category. Reference traffic (800 req/min) and the connection/latency
// figures below reuse this scenario's existing authored truth
// (ev-traffic-normal, ev-db-connections in scenario.ts) rather than
// inventing new numbers.

export const blackFridaySustainedLoadProfile: StressProfile = {
  id: "sustained-load",
  scenarioId: "black-friday-capacity-surge",
  label: "Sustained Load",
  description: "Test steady-state capacity at a fixed traffic level.",
  category: "load",
  durationSeconds: 300,
  stepSeconds: 30,
  parameters: [
    { id: "requestsPerMinute", label: "Traffic", description: "Checkout requests per minute.", type: "number", unit: "req/min", defaultValue: 15000, min: 5000, max: 60000, step: 1000, editable: true },
    // Informational only in this phase - demand is driven entirely by requestsPerMinute (ponytail: add if a future test needs concurrency modeled separately from rpm).
    { id: "concurrentRequests", label: "Concurrent requests", description: "Requests in flight at any moment.", type: "number", defaultValue: 500, min: 50, max: 5000, step: 50, editable: true },
    { id: "duration", label: "Duration", description: "How long this test runs.", type: "duration", unit: "s", defaultValue: 300, min: 60, max: 600, step: 30, editable: false },
  ],
};

export const blackFridayTrafficSpikeProfile: StressProfile = {
  id: "traffic-spike",
  scenarioId: "black-friday-capacity-surge",
  label: "Traffic Spike",
  description: "See how the architecture handles rapid load growth.",
  category: "spike",
  durationSeconds: 180,
  stepSeconds: 15,
  parameters: [
    { id: "baselineRequestsPerMinute", label: "Baseline traffic", description: "Traffic before the spike.", type: "number", unit: "req/min", defaultValue: 800, min: 200, max: 5000, step: 100, editable: true },
    { id: "spikeRequestsPerMinute", label: "Spike traffic", description: "Peak traffic during the spike.", type: "number", unit: "req/min", defaultValue: 32000, min: 5000, max: 60000, step: 1000, editable: true },
    { id: "rampSeconds", label: "Ramp time", description: "How long traffic takes to rise to spike level.", type: "duration", unit: "s", defaultValue: 30, min: 5, max: 120, step: 5, editable: true },
    { id: "spikeDuration", label: "Spike duration", description: "How long traffic holds at the spike level.", type: "duration", unit: "s", defaultValue: 90, min: 15, max: 300, step: 15, editable: true },
  ],
};

export const blackFridayPaymentDegradationProfile: StressProfile = {
  id: "payment-provider-degradation",
  scenarioId: "black-friday-capacity-surge",
  label: "Payment Provider Degradation",
  description: "Test downstream latency/failure isolation.",
  category: "dependency_degradation",
  durationSeconds: 300,
  stepSeconds: 30,
  parameters: [
    { id: "providerLatencyMs", label: "Provider latency", description: "Payment provider response latency.", type: "number", unit: "ms", defaultValue: 4000, min: 200, max: 20000, step: 200, editable: true },
    { id: "providerErrorRate", label: "Provider error rate", description: "Fraction of payment calls that fail.", type: "percentage", unit: "%", defaultValue: 0, min: 0, max: 1, step: 0.05, editable: true },
    { id: "duration", label: "Duration", description: "How long the provider stays degraded.", type: "duration", unit: "s", defaultValue: 300, min: 60, max: 600, step: 30, editable: false },
    // Fixed at this scenario's documented normal rate (ev-traffic-normal); not learner-editable, so degradation effects aren't hidden behind also raising traffic.
    { id: "referenceTrafficRequestsPerMinute", label: "Reference traffic", description: "Traffic level this test holds steady.", type: "number", unit: "req/min", defaultValue: 800, editable: false },
  ],
};

export const blackFridayDatabaseSaturationProfile: StressProfile = {
  id: "database-saturation",
  scenarioId: "black-friday-capacity-surge",
  label: "Database Saturation",
  description: "Test fixed downstream capacity.",
  category: "resource_saturation",
  durationSeconds: 60,
  stepSeconds: 30,
  parameters: [
    { id: "requestsPerMinute", label: "Traffic", description: "Checkout requests per minute.", type: "number", unit: "req/min", defaultValue: 32000, min: 5000, max: 60000, step: 1000, editable: true },
    { id: "databaseMaxConnections", label: "Max DB connections", description: "The database's connection ceiling.", type: "number", defaultValue: 500, min: 50, max: 2000, step: 50, editable: true },
    { id: "databaseBaseLatencyMs", label: "DB base latency", description: "Typical database round-trip time before contention.", type: "number", unit: "ms", defaultValue: 150, min: 10, max: 1000, step: 10, editable: true },
  ],
};

export const blackFridayRegionalFailureProfile: StressProfile = {
  id: "regional-database-failure",
  scenarioId: "black-friday-capacity-surge",
  label: "Regional Database Failure",
  description: "Test availability/failover.",
  category: "regional_failure",
  durationSeconds: 480,
  stepSeconds: 30,
  parameters: [
    { id: "requestsPerMinute", label: "Traffic", description: "Checkout requests per minute during the failure.", type: "number", unit: "req/min", defaultValue: 800, min: 200, max: 60000, step: 100, editable: true },
    { id: "failureStartTime", label: "Failure start", description: "When the regional outage begins.", type: "duration", unit: "s", defaultValue: 30, min: 0, max: 120, step: 15, editable: true },
    { id: "failureDuration", label: "Failure duration", description: "How long the region stays down (no failover means recovery is tied to this).", type: "duration", unit: "s", defaultValue: 360, min: 15, max: 420, step: 15, editable: true },
  ],
};

export const blackFridayTestDefinitions: StressProfile[] = [
  blackFridaySustainedLoadProfile,
  blackFridayTrafficSpikeProfile,
  blackFridayPaymentDegradationProfile,
  blackFridayDatabaseSaturationProfile,
  blackFridayRegionalFailureProfile,
];

const availabilityAndRtoTargets: RequirementTarget[] = [
  { requirementId: "req-availability", area: "availability", targetPercent: 99.95 },
  { requirementId: "req-rto", area: "recovery", targetSeconds: 300 },
];

const requirementTargetsByTestId: Record<string, RequirementTarget[]> = {
  [blackFridaySustainedLoadProfile.id]: throughputAndLatencyTargets,
  [blackFridayTrafficSpikeProfile.id]: throughputAndLatencyTargets,
  [blackFridayPaymentDegradationProfile.id]: [{ requirementId: "req-latency", area: "latency", targetMs: 800 }],
  [blackFridayDatabaseSaturationProfile.id]: throughputAndLatencyTargets,
  [blackFridayRegionalFailureProfile.id]: availabilityAndRtoTargets,
};

/** Builds the private engine input for one of this scenario's five stress tests, or undefined if testId is unknown. */
export function buildBlackFridayTimelineInput(
  testId: string,
  parameters: Record<string, number>,
  modifications: StressTimelineTestInput["modifications"],
): StressTimelineTestInput | undefined {
  const profile = blackFridayTestDefinitions.find((p) => p.id === testId);
  const requirementTargets = requirementTargetsByTestId[testId];
  if (!profile || !requirementTargets) return undefined;

  const merged = Object.fromEntries(profile.parameters.map((p) => [p.id, parameters[p.id] ?? p.defaultValue]));
  return {
    testId,
    category: profile.category,
    durationSeconds: profile.durationSeconds,
    stepSeconds: profile.stepSeconds,
    parameters: merged,
    componentProfiles: blackFridayComponentProfiles,
    database: blackFridayDatabaseProfile,
    modifications,
    requirementTargets,
  };
}

export const blackFridayInterventions: InterventionDefinition[] = [
  {
    componentType: "connection-pooler",
    label: "Connection Pooler",
    category: "Performance",
    purpose: "Caps backend database connections per service and improves connection reuse.",
    tradeoff: {
      operationalComplexity: "medium",
      costImpact: "low",
      tradeoff: "May introduce request queueing latency once demand exceeds the configured cap.",
    },
    validTargets: [{ edgeId: "checkout-service-postgres" }, { edgeId: "inventory-service-postgres" }],
    configFields: [{ key: "maxBackendConnections", label: "Max backend connections", defaultValue: 150, min: 20, max: 400, step: 10 }],
  },
  {
    componentType: "autoscaling-policy",
    label: "Autoscaling Policy",
    category: "Scaling",
    purpose: "Sets the maximum instance count a service may scale out to.",
    tradeoff: {
      operationalComplexity: "low",
      costImpact: "medium",
      tradeoff: "Increases service-instance capacity within the configured limit, but does not scale the database it depends on.",
    },
    validTargets: [{ nodeId: "checkout-service" }, { nodeId: "inventory-service" }],
    configFields: [{ key: "maxInstances", label: "Max instances", defaultValue: 8, min: 3, max: 20, step: 1 }],
  },
  {
    componentType: "cache",
    label: "Cache",
    category: "Performance",
    purpose: "Reduces eligible repeated read load on the database.",
    tradeoff: {
      operationalComplexity: "medium",
      costImpact: "low",
      tradeoff: "Only reduces read traffic; does not reduce transactional writes and introduces cache invalidation responsibility.",
    },
    validTargets: [{ edgeId: "inventory-service-postgres" }],
    configFields: [{ key: "hitRate", label: "Cache hit rate", defaultValue: 0.5, min: 0, max: 0.95, step: 0.05 }],
  },
  {
    componentType: "load-balancer",
    label: "Load Balancer",
    category: "Traffic Management",
    purpose: "Distributes incoming request load across compatible service instances.",
    tradeoff: {
      operationalComplexity: "low",
      costImpact: "low",
      tradeoff: "Balances application-layer load only; it cannot relieve a saturated downstream database.",
    },
    validTargets: [{ edgeId: "api-gateway-checkout-service" }],
    configFields: [],
  },
  {
    componentType: "read-replica",
    label: "Read Replica",
    category: "Data",
    purpose: "Offloads eligible read traffic from the primary database.",
    tradeoff: {
      operationalComplexity: "medium",
      costImpact: "medium",
      tradeoff: "Only helps eligible reads (Inventory Service); does not help Checkout Service's write-heavy path, and replication lag may cause stale reads.",
    },
    validTargets: [{ nodeId: "postgres" }],
    configFields: [],
  },
  {
    componentType: "database-failover",
    label: "Database Failover",
    category: "Resilience",
    purpose: "Provisions a standby database in another region and bounds how long recovery takes during a regional failure.",
    tradeoff: {
      operationalComplexity: "high",
      costImpact: "high",
      tradeoff: "Improves regional resilience according to its configured recovery time, but does not speed up recovery beyond that configuration and adds ongoing replication cost.",
    },
    validTargets: [{ nodeId: "postgres" }],
    configFields: [{ key: "recoverySeconds", label: "Recovery time", unit: "s", defaultValue: 60, min: 10, max: 300, step: 10 }],
  },
  {
    componentType: "timeout",
    label: "Timeout",
    category: "Resilience",
    purpose: "Bounds how long Checkout Service waits on a synchronous call before giving up.",
    tradeoff: {
      operationalComplexity: "low",
      costImpact: "low",
      tradeoff: "Bounds resource occupancy and can improve latency, but does not fix the slow dependency - waited-out calls become failures instead.",
    },
    validTargets: [{ edgeId: "checkout-service-payment-provider" }],
    configFields: [{ key: "timeoutMs", label: "Timeout", unit: "ms", defaultValue: 1500, min: 200, max: 10000, step: 100 }],
  },
  {
    componentType: "circuit-breaker",
    label: "Circuit Breaker",
    category: "Resilience",
    purpose: "Stops calling a dependency that is failing past a threshold, failing fast instead of waiting.",
    tradeoff: {
      operationalComplexity: "medium",
      costImpact: "low",
      tradeoff: "Protects Checkout Service's own capacity from a failing dependency, but does not heal the dependency and reduces functionality while open.",
    },
    validTargets: [{ edgeId: "checkout-service-payment-provider" }],
    configFields: [
      { key: "failureThreshold", label: "Failure threshold", defaultValue: 0.5, min: 0.1, max: 1, step: 0.05 },
      { key: "window", label: "Failure window", unit: "s", defaultValue: 10, min: 5, max: 60, step: 5 },
      { key: "recoverySeconds", label: "Recovery attempt after", unit: "s", defaultValue: 30, min: 10, max: 120, step: 10 },
    ],
  },
  {
    componentType: "retry-policy",
    label: "Retry Policy",
    category: "Resilience",
    purpose: "Retries a failed call to the payment provider a bounded number of times.",
    tradeoff: {
      operationalComplexity: "medium",
      costImpact: "low",
      tradeoff: "May recover transient failures, but amplifies effective demand on Checkout Service when the dependency is failing - risking a retry storm.",
    },
    validTargets: [{ edgeId: "checkout-service-payment-provider" }],
    configFields: [
      { key: "retryCount", label: "Max retries", defaultValue: 2, min: 0, max: 5, step: 1 },
      {
        key: "backoff",
        label: "Backoff strategy",
        defaultValue: 1,
        options: [
          { label: "None", value: 0 },
          { label: "Fixed", value: 1 },
          { label: "Exponential", value: 2 },
        ],
      },
    ],
  },
  {
    componentType: "rate-limiter",
    label: "Rate Limiter",
    category: "Traffic Management",
    purpose: "Admits only up to a configured request rate, rejecting the rest to protect downstream capacity.",
    tradeoff: {
      operationalComplexity: "low",
      costImpact: "low",
      tradeoff: "Protects the architecture from cascading overload, but rejects legitimate requests once the limit is reached.",
    },
    validTargets: [{ nodeId: "checkout-service" }],
    configFields: [{ key: "requestRateLimit", label: "Request rate limit", unit: "req/min", defaultValue: 20000, min: 1000, max: 60000, step: 1000 }],
  },
];
