import { InternalPracticeScenarioSchema, type InternalPracticeScenario } from "../internalPracticeScenario.js";

// The five Black Friday Checkout practice situations (product spec: five
// situations within one system, not five architectures). Each reuses the
// existing hidden risks / stress tests / requirements / evidence authored
// in ./internal.ts rather than duplicating scenario truth.
//
// ponytail: Checkout Latency Spike (order 1) has no dedicated stress-test
// fixture of its own - it reuses stress-10x-spike (the same connection-
// exhaustion mechanism, viewed at an earlier/lower-traffic moment) rather
// than authoring a near-duplicate fixture. Revisit with a dedicated
// "moderate load" fixture if the consequence reveal needs to look
// materially different from Scenario 4's.

const checkoutLatencySpike: InternalPracticeScenario = InternalPracticeScenarioSchema.parse({
  publicScenario: {
    id: "checkout-latency-spike",
    order: 1,
    title: "Checkout Latency Spike",
    shortDescription: "Checkout p95 latency has exceeded target during a moderate traffic increase.",
    situation:
      "Checkout p95 latency has exceeded the 800 ms target during a moderate increase in traffic. No major service is completely unavailable.",
    objective:
      "Determine what's contributing to the latency increase and decide what to do about it, now and longer term.",
    requirementIds: ["req-latency", "req-throughput"],
    investigationPrompts: [
      "Where would you look first to narrow down the cause?",
      "What in the architecture could behave differently under moderately higher load than at baseline?",
      "Which requirements are most at risk if this continues?",
    ],
    availableResourceTypes: ["architecture", "requirements", "evidence", "architect"],
  },
  expectedConcepts: [
    {
      id: "shared-database-contention",
      label: "Shared database contention",
      phrases: ["connection", "database bottleneck", "contention", "queue", "backlog", "postgres"],
      teaching:
        "Checkout Service and Inventory Service both scale horizontally against one fixed-capacity Postgres instance; contention there shows up as rising latency well before anything becomes fully unavailable.",
    },
  ],
  acceptedInvestigationConcepts: [
    {
      id: "check-db-connections",
      label: "Check database connection usage",
      phrases: ["connection count", "connection usage", "connection limit"],
      teaching: "Comparing active connections against the configured limit is the fastest way to confirm or rule out database contention.",
    },
  ],
  acceptedImmediateActionConcepts: [
    {
      id: "reduce-connection-pressure",
      label: "Reduce connection pressure",
      phrases: ["connection pool", "pgbouncer", "reduce connections", "cap instances", "backpressure"],
      teaching: "Pooling or capping connections buys headroom immediately without a redesign.",
    },
  ],
  acceptedArchitectureDecisionConcepts: [
    {
      id: "connection-pooling-layer",
      label: "Add a connection pooling layer",
      phrases: ["connection pooler", "pgbouncer", "read replica", "proxy layer"],
      teaching: "A pooling layer or read replica decouples service instance count from database connection count long term.",
    },
  ],
  severityTruth: "medium",
  linkedHiddenRiskIds: ["risk-db-connection-exhaustion", "risk-observability-gap"],
  linkedStressTestIds: ["stress-10x-spike"],
  // Sustained Load is the primary fit: moderate steady traffic showing the
  // shared-database contention this situation describes. Payment Provider
  // Degradation is also offered since a slow synchronous dependency is
  // another plausible contributor to rising p95 the learner can compare
  // against (spec: "Checkout Latency Spike" mapping).
  stressLabTestIds: ["sustained-load", "payment-provider-degradation"],
  expectedRequirementIds: ["req-latency", "req-throughput"],
  relevantEvidenceIds: ["ev-traffic-peak", "ev-db-connections"],
});

const paymentProviderDegradation: InternalPracticeScenario = InternalPracticeScenarioSchema.parse({
  publicScenario: {
    id: "payment-provider-degradation",
    order: 2,
    title: "Payment Provider Degradation",
    shortDescription: "The external payment provider's latency has spiked while checkout traffic stays high.",
    situation:
      "The external payment provider's latency has increased dramatically while checkout traffic remains high.",
    objective: "Diagnose how the provider's slowdown is affecting checkout, and decide what to do about it.",
    requirementIds: ["req-latency", "req-availability", "req-process-payment"],
    investigationPrompts: [
      "How does Checkout Service call the payment provider, and what happens while it waits?",
      "What's configured if the provider call takes too long?",
      "What would you check to confirm the provider itself has degraded?",
    ],
    availableResourceTypes: ["architecture", "requirements", "evidence", "architect"],
  },
  expectedConcepts: [
    {
      id: "synchronous-dependency",
      label: "Synchronous external dependency",
      phrases: ["synchronous", "waits on", "blocking", "external dependency", "third party", "third-party"],
      teaching: "Checkout Service calls the payment provider synchronously in the request path, so the provider's availability becomes checkout's availability.",
    },
  ],
  acceptedInvestigationConcepts: [
    {
      id: "check-provider-latency",
      label: "Check provider latency and timeout config",
      phrases: ["provider latency", "p99", "timeout config", "timeout setting"],
      teaching: "Confirming provider latency against the configured (or missing) timeout isolates whether this is a provider problem or a checkout problem.",
    },
  ],
  acceptedImmediateActionConcepts: [
    {
      id: "bounded-timeout",
      label: "Bounded timeout / fail fast",
      phrases: ["timeout", "bounded timeout", "fail fast", "shed load", "reject"],
      teaching: "A bounded timeout stops one slow dependency from exhausting worker capacity for unrelated requests.",
    },
  ],
  acceptedArchitectureDecisionConcepts: [
    {
      id: "circuit-breaker",
      label: "Circuit breaker / isolate the dependency",
      phrases: ["circuit breaker", "bulkhead", "decouple", "isolate"],
      teaching: "A circuit breaker (or bulkheading worker capacity) isolates a degrading dependency instead of letting every request pay its latency.",
    },
  ],
  severityTruth: "high",
  linkedHiddenRiskIds: ["risk-missing-timeout", "risk-payment-dependency"],
  linkedStressTestIds: ["stress-payment-degradation"],
  // Payment Provider Degradation is the direct match. Sustained Load is
  // offered secondarily so the learner can also see the dependency's effect
  // isolated from any traffic increase.
  stressLabTestIds: ["payment-provider-degradation", "sustained-load"],
  expectedRequirementIds: ["req-latency", "req-availability", "req-process-payment"],
  relevantEvidenceIds: ["ev-payment-latency", "ev-payment-p99"],
});

const duplicateCheckoutRequests: InternalPracticeScenario = InternalPracticeScenarioSchema.parse({
  publicScenario: {
    id: "duplicate-checkout-requests",
    order: 3,
    title: "Duplicate Checkout Requests",
    shortDescription: "Some customers retry checkout after network errors; a subset reports duplicate payment activity.",
    situation: "Some customers retry checkout after network errors. A subset reports duplicate payment activity.",
    objective: "Diagnose why retries are producing duplicate activity, and decide what to do about it.",
    requirementIds: ["req-process-payment", "req-create-order"],
    investigationPrompts: [
      "What happens if the same checkout request reaches Checkout Service twice?",
      "Is anything tying a charge or order write to a single logical checkout attempt?",
      "What would a customer's retry look like from the server's point of view?",
    ],
    availableResourceTypes: ["architecture", "requirements", "evidence", "architect"],
  },
  expectedConcepts: [
    {
      id: "no-idempotency-key",
      label: "No idempotency key on the checkout request",
      phrases: ["idempoten", "duplicate", "retry safety", "keyed to"],
      teaching: "Without an idempotency key, a retried or resubmitted request is indistinguishable from a new checkout attempt.",
    },
  ],
  acceptedInvestigationConcepts: [
    {
      id: "trace-retry-path",
      label: "Trace what a retried request does downstream",
      phrases: ["retry", "resubmit", "double-click", "duplicate request"],
      teaching: "Walking a retried request through Checkout Service's calls shows there's nothing keying it to the first attempt.",
    },
  ],
  acceptedImmediateActionConcepts: [
    {
      id: "dedupe-at-request-time",
      label: "Reject or dedupe the second request",
      phrases: ["idempotency key", "dedupe", "deduplicat", "reject duplicate"],
      teaching: "Recognizing the duplicate at request time stops a second charge or order from happening at all.",
    },
  ],
  acceptedArchitectureDecisionConcepts: [
    {
      id: "idempotent-write-path",
      label: "Idempotent charge and order write",
      phrases: ["idempotency key", "unique constraint", "dedupe table", "idempotent"],
      teaching: "Keying both the payment charge and the order write to a client-supplied idempotency key makes retries safe by construction.",
    },
  ],
  severityTruth: "critical",
  linkedHiddenRiskIds: ["risk-payment-idempotency"],
  linkedStressTestIds: ["stress-duplicate-checkout"],
  // Intentionally empty: no current Stress Lab test represents duplicate-
  // request/retry/idempotency behavior (the engine has no such mechanic
  // yet). Do not map this to Database Saturation or Traffic Spike - neither
  // technically represents duplicate-payment behavior, and a fabricated
  // mapping would teach the wrong thing. Revisit once a retry/idempotency
  // simulation exists (see final report's recommended next extension).
  stressLabTestIds: [],
  expectedRequirementIds: ["req-process-payment", "req-create-order"],
  relevantEvidenceIds: [],
});

const blackFridayCapacitySurge: InternalPracticeScenario = InternalPracticeScenarioSchema.parse({
  publicScenario: {
    id: "black-friday-capacity-surge",
    order: 4,
    title: "Black Friday Capacity Surge",
    shortDescription: "Traffic approaches projected Black Friday peak; services autoscale but latency keeps rising.",
    situation:
      "Traffic rapidly approaches projected Black Friday load. Application services successfully autoscale, but system latency continues to rise.",
    objective: "Find the resource that autoscaling doesn't fix, and decide what to do about it.",
    requirementIds: ["req-throughput", "req-latency"],
    investigationPrompts: [
      "Every service that scaled out - what shared resource do they all still depend on?",
      "What happens to that resource as each service adds more instances?",
      "Is there a hard ceiling anywhere in this path that doesn't scale with instance count?",
    ],
    availableResourceTypes: ["architecture", "requirements", "evidence", "architect"],
  },
  expectedConcepts: [
    {
      id: "fixed-capacity-database",
      label: "Fixed-capacity database behind scaled services",
      phrases: ["connection pool", "database bottleneck", "connection limit", "fixed capacity", "horizontal scaling limit"],
      teaching: "Checkout Service and Inventory Service scale horizontally, but both connect directly to one Postgres instance with a fixed connection ceiling.",
    },
  ],
  acceptedInvestigationConcepts: [
    {
      id: "compare-connections-to-limit",
      label: "Compare projected connections to the database's connection limit",
      phrases: ["connection limit", "connections per instance", "instance count"],
      teaching: "Multiplying peak instance counts by connections-per-instance and comparing to the stated 500-connection limit reveals the ceiling directly.",
    },
  ],
  acceptedImmediateActionConcepts: [
    {
      id: "pool-or-cap-connections",
      label: "Pool or cap database connections",
      phrases: ["connection pooler", "pgbouncer", "reduce connections", "cap instances", "backpressure"],
      teaching: "Pooling connections or capping instance growth relieves the ceiling immediately without a redesign.",
    },
  ],
  acceptedArchitectureDecisionConcepts: [
    {
      id: "decouple-scaling-from-db-connections",
      label: "Decouple service scaling from database connection count",
      phrases: ["read replica", "connection pooler", "pgbouncer", "shard", "proxy layer"],
      teaching: "A pooling layer, read replicas, or sharding let services scale out without each instance claiming its own database connection.",
    },
  ],
  severityTruth: "high",
  linkedHiddenRiskIds: ["risk-db-connection-exhaustion"],
  linkedStressTestIds: ["stress-10x-spike"],
  // Traffic Spike is primary (rapid ramp to flash-sale projection, matching
  // "traffic rapidly approaches projected Black Friday load"). Database
  // Saturation is secondary, isolating the fixed-capacity-database mechanic
  // directly. Sustained Load rounds it out for steady-state practice.
  stressLabTestIds: ["traffic-spike", "database-saturation", "sustained-load"],
  expectedRequirementIds: ["req-throughput", "req-latency"],
  relevantEvidenceIds: ["ev-traffic-peak", "ev-traffic-flash", "ev-db-connections"],
});

const regionalDatabaseFailure: InternalPracticeScenario = InternalPracticeScenarioSchema.parse({
  publicScenario: {
    id: "regional-database-failure",
    order: 5,
    title: "Regional Database Failure",
    shortDescription: "The primary database region becomes unavailable; the system has strict recovery requirements.",
    situation: "The primary database region becomes unavailable. The system has strict recovery requirements.",
    objective: "Assess whether the current design can meet its recovery requirements, and decide what to do about it.",
    requirementIds: ["req-rpo", "req-rto", "req-availability"],
    investigationPrompts: [
      "Where else does the design run a copy of the Orders DB?",
      "What is the stated RPO/RTO, and what would actually have to happen to hit it?",
      "What tradeoff does adding cross-region recovery introduce?",
    ],
    availableResourceTypes: ["architecture", "requirements", "evidence", "architect"],
  },
  expectedConcepts: [
    {
      id: "single-region-single-point-of-failure",
      label: "Single-region single point of failure",
      phrases: ["single point of failure", "single region", "no replica", "no standby", "disaster recovery"],
      teaching: "Orders DB is deployed as a single primary in one region with no documented replication or failover target.",
    },
  ],
  acceptedInvestigationConcepts: [
    {
      id: "compare-design-to-rpo-rto",
      label: "Compare the design against the stated RPO/RTO",
      phrases: ["rpo", "rto", "recovery time", "recovery point"],
      teaching: "Checking the deployment topology against the stated recovery targets shows directly whether they can be met.",
    },
  ],
  acceptedImmediateActionConcepts: [
    {
      id: "manual-failover",
      label: "Failover to a standby / activate the recovery runbook",
      phrases: ["failover", "standby", "promote replica", "dr runbook", "recovery runbook"],
      teaching: "Without an automated failover target, the immediate response is a manual promotion or recovery runbook - which itself needs to exist ahead of time.",
    },
  ],
  acceptedArchitectureDecisionConcepts: [
    {
      id: "cross-region-replication",
      label: "Cross-region replication with automated failover",
      phrases: ["multi-region", "cross-region replication", "standby region", "automated failover"],
      teaching: "A replicated standby in a second region, with automated failover, is what actually achieves a bounded RPO/RTO during a regional outage.",
    },
  ],
  severityTruth: "critical",
  linkedHiddenRiskIds: ["risk-single-region-persistence"],
  linkedStressTestIds: ["stress-regional-db-failure"],
  // Only Regional Database Failure applies - do not pad this with unrelated
  // tests just to fill the screen.
  stressLabTestIds: ["regional-database-failure"],
  expectedRequirementIds: ["req-rpo", "req-rto", "req-availability"],
  relevantEvidenceIds: ["ev-db-deployment"],
});

export const blackFridayPracticeScenarios: InternalPracticeScenario[] = [
  checkoutLatencySpike,
  paymentProviderDegradation,
  duplicateCheckoutRequests,
  blackFridayCapacitySurge,
  regionalDatabaseFailure,
];
