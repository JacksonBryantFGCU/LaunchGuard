import {
  InternalArchitectureScenarioSchema,
  type ArchitectContext,
  type EvaluationRubric,
  type HiddenRisk,
  type StressTest,
} from "../internalScenario.js";
import { blackFridayCheckoutScenario } from "./scenario.js";

// Private scenario truth for Black Friday Checkout. Authored once, referenced
// by tests and (later) by evaluation/voice phases - never by the public
// registry or the API/frontend.

const architectContext: ArchitectContext = {
  background:
    "Alex has owned the checkout service for two years and led the last major replatform onto the current payment provider integration.",
  behavior:
    "Alex is confident and collaborative, defends design choices with the constraints he was given, and is open to being challenged on tradeoffs he made deliberately under time pressure.",
  assumptions: [
    "The payment provider's published SLAs are representative of Black Friday behavior.",
    "PostgreSQL's existing connection limit is generous enough given current traffic projections.",
    "At-least-once delivery on the order-created event is an acceptable default for this event's consumers.",
  ],
  rationale: [
    "Chose a synchronous call to the payment provider because the checkout flow needs an authoritative success/failure result before creating the order.",
    "Chose a single-region PostgreSQL deployment because the team's operational expertise is concentrated there and a multi-region datastore was out of scope for this deadline.",
    "Chose to publish an OrderCreated event and hand off fulfillment/notification asynchronously so the customer-facing request path stays short.",
  ],
  knownTradeoffs: [
    "Synchronous payment calls simplify the flow but couple checkout latency and availability to the provider's.",
    "Single-region persistence is operationally simpler but weakens the recovery story during a regional outage.",
    "Deep PostgreSQL expertise made it the default choice even though it introduces a shared bottleneck across services.",
  ],
  implementationDecisions: [
    "Checkout Service calls Inventory Service synchronously to reserve stock before charging the customer.",
    "Checkout Service writes the order record directly to Postgres in the same request that calls the payment provider.",
    "Retries on the payment provider call are configured at the HTTP client level with a fixed retry count.",
  ],
};

const hiddenRisks: HiddenRisk[] = [
  {
    id: "risk-payment-dependency",
    title: "Synchronous payment dependency",
    category: "resilience",
    severity: "high",
    description:
      "Checkout Service calls the external Payment Provider synchronously in the request path, so the provider's availability becomes checkout's availability.",
    affectedNodeIds: ["checkout-service", "payment-provider"],
    affectedEdgeIds: ["checkout-service-payment-provider"],
    evidence: ["ev-payment-latency", "ev-payment-p99"],
    requirementIds: ["req-availability", "req-process-payment"],
    expectedReviewerInsight:
      "A reviewer should recognize that a hard synchronous dependency on a third party puts an external SLA in the critical path of an internal availability target.",
    matchingConcepts: ["synchronous coupling", "external dependency", "availability risk"],
  },
  {
    id: "risk-payment-idempotency",
    title: "Missing payment idempotency",
    category: "data-integrity",
    severity: "critical",
    description:
      "Client resubmission or a retried request can call the payment provider and create the order twice; nothing in the design keys the charge or the order write to an idempotency token.",
    affectedNodeIds: ["checkout-service"],
    affectedEdgeIds: ["checkout-service-payment-provider", "checkout-service-postgres"],
    evidence: ["ev-payment-p99"],
    requirementIds: ["req-process-payment", "req-create-order"],
    expectedReviewerInsight:
      "A reviewer should ask what stops a retried or resubmitted checkout request from creating a duplicate charge or order.",
    matchingConcepts: ["idempotency", "duplicate payment", "retry safety"],
  },
  {
    id: "risk-missing-timeout",
    title: "Missing external call timeout",
    category: "reliability",
    severity: "high",
    description:
      "The connection to the Payment Provider has no explicit timeout configured; a slow or hung provider response can hold checkout worker capacity indefinitely.",
    affectedNodeIds: ["checkout-service", "payment-provider"],
    affectedEdgeIds: ["checkout-service-payment-provider"],
    evidence: ["ev-payment-p99"],
    requirementIds: ["req-latency", "req-availability"],
    expectedReviewerInsight:
      "A reviewer should notice the connection details list no timeout on the payment call, and connect that to worker/thread exhaustion under provider degradation.",
    matchingConcepts: ["timeout", "resource exhaustion", "cascading failure"],
  },
  {
    id: "risk-db-connection-exhaustion",
    title: "Database connection exhaustion",
    category: "scalability",
    severity: "high",
    description:
      "Checkout Service and Inventory Service both scale horizontally and connect directly to Postgres; at peak instance counts they can approach or exceed the database's 500 connection limit.",
    affectedNodeIds: ["postgres", "checkout-service", "inventory-service"],
    affectedEdgeIds: ["checkout-service-postgres", "inventory-service-postgres"],
    evidence: ["ev-db-connections", "ev-traffic-peak", "ev-traffic-flash"],
    requirementIds: ["req-throughput"],
    expectedReviewerInsight:
      "A reviewer should multiply projected service instance counts by connections-per-instance and compare against the stated Postgres connection limit.",
    matchingConcepts: ["connection pooling", "database bottleneck", "horizontal scaling limits"],
  },
  {
    id: "risk-single-region-persistence",
    title: "Single-region persistence",
    category: "resilience",
    severity: "critical",
    description:
      "Orders DB is deployed as a single primary in one region with no documented replication or failover target, which does not satisfy the stated recovery objectives during a regional failure.",
    affectedNodeIds: ["postgres"],
    affectedEdgeIds: [],
    evidence: ["ev-db-deployment"],
    requirementIds: ["req-rpo", "req-rto", "req-availability"],
    expectedReviewerInsight:
      "A reviewer should compare the single-region deployment against the stated RPO/RTO targets and identify that nothing in the design achieves them during a regional outage.",
    matchingConcepts: ["single point of failure", "disaster recovery", "RPO/RTO"],
  },
  {
    id: "risk-inventory-concurrency",
    title: "Inventory reservation race condition",
    category: "data-integrity",
    severity: "high",
    description:
      "Concurrent inventory reservation requests read and update cached and persisted stock counts without a described locking or atomic-decrement strategy, which can oversell limited-stock items under load.",
    affectedNodeIds: ["inventory-service"],
    affectedEdgeIds: ["inventory-service-redis", "inventory-service-postgres"],
    evidence: ["ev-traffic-peak", "ev-traffic-flash"],
    requirementIds: ["req-reserve-inventory"],
    expectedReviewerInsight:
      "A reviewer should ask how concurrent reservations against the same SKU are serialized, and notice that neither the cache nor the database interaction describes one.",
    matchingConcepts: ["race condition", "overselling", "concurrency control"],
  },
  {
    id: "risk-poison-message",
    title: "No poison-message handling",
    category: "operability",
    severity: "medium",
    description:
      "The queue/worker path has at-least-once delivery but no described dead-letter queue or max-redelivery policy, so a message the worker cannot process can be redelivered indefinitely.",
    affectedNodeIds: ["message-queue", "order-worker"],
    affectedEdgeIds: ["checkout-service-message-queue", "message-queue-order-worker"],
    evidence: [],
    requirementIds: ["req-create-order", "req-send-confirmation"],
    expectedReviewerInsight:
      "A reviewer should ask what happens when Order Worker repeatedly fails to process a message, and notice no dead-letter or failure path is described.",
    matchingConcepts: ["dead-letter queue", "poison message", "failure isolation"],
  },
  {
    id: "risk-observability-gap",
    title: "Insufficient cross-service observability",
    category: "operability",
    severity: "medium",
    description:
      "Requests cross five services and an async queue hop with no described correlation ID or distributed tracing, making it difficult to diagnose failures across the checkout flow during an incident.",
    affectedNodeIds: ["checkout-service", "inventory-service", "order-worker", "notification-service"],
    affectedEdgeIds: [],
    evidence: [],
    requirementIds: ["req-availability"],
    expectedReviewerInsight:
      "A reviewer should notice that nothing in the architecture ties a single checkout request's logs together across services, which will slow incident response during the peak window.",
    matchingConcepts: ["distributed tracing", "correlation id", "observability"],
  },
];

const stressTests: StressTest[] = [
  {
    id: "stress-normal-traffic",
    name: "Normal traffic",
    description: "Baseline load at the documented normal checkout rate.",
    trigger: "800 checkout requests/minute sustained for 30 minutes.",
    affectedNodes: [],
    affectedEdges: [],
    status: "pass",
    revealsRiskIds: [],
    expectedBehavior: "All checkout requests complete within the latency target with no errors.",
    observedBehavior: "Checkout completes normally; no capacity or timeout issues observed.",
    explanation: "At normal traffic none of the design's latent risks are exercised.",
    steps: [
      {
        id: "stress-normal-traffic-step-1",
        sequence: 1,
        title: "Checkout handles baseline load",
        description: "800 checkout requests/minute flow through the full path with no contention.",
        nodeEffects: [
          { nodeId: "checkout-service", state: "normal", explanation: "Instance count comfortably covers baseline demand." },
          { nodeId: "postgres", state: "normal", explanation: "Connection usage stays well under the configured limit." },
        ],
        edgeEffects: [
          { edgeId: "checkout-service-payment-provider", state: "normal", explanation: "Payment provider responds at its typical 220ms latency." },
        ],
        requirementImpacts: [
          { requirementId: "req-throughput", status: "met", observedValue: "800 requests/min", explanation: "Well within provisioned capacity." },
          { requirementId: "req-latency", status: "met", observedValue: "p95 well under 800ms", explanation: "No queuing observed anywhere in the path." },
        ],
      },
    ],
  },
  {
    id: "stress-10x-spike",
    name: "10x traffic spike",
    description: "A sudden spike to the projected flash-sale rate.",
    trigger: "Traffic rises from 800 to 32,000 requests/minute over two minutes.",
    affectedNodes: ["postgres", "checkout-service", "inventory-service"],
    affectedEdges: ["checkout-service-postgres", "inventory-service-postgres"],
    status: "fail",
    revealsRiskIds: ["risk-db-connection-exhaustion"],
    expectedBehavior: "Services scale out and checkout throughput keeps pace with demand.",
    observedBehavior: "Postgres connection count approaches its configured limit as both services scale out, and new connections begin failing.",
    explanation: "Horizontal scaling of two services against one connection-limited database was never reconciled against the stated flash-sale projection.",
    steps: [
      {
        id: "stress-10x-spike-step-1",
        sequence: 1,
        title: "Traffic surge begins",
        description: "Checkout traffic rises from 800 to 32,000 requests/minute over two minutes.",
        nodeEffects: [
          { nodeId: "api-gateway", state: "degraded", metricLabel: "Requests/min", metricValue: "32,000", explanation: "Inbound load climbs 40x over baseline." },
        ],
        edgeEffects: [],
        requirementImpacts: [{ requirementId: "req-throughput", status: "at_risk", explanation: "Demand now exceeds the provisioned baseline capacity." }],
      },
      {
        id: "stress-10x-spike-step-2",
        sequence: 2,
        title: "Checkout and Inventory scale out",
        description: "Both services scale horizontally to absorb the surge, each opening more database connections.",
        nodeEffects: [
          { nodeId: "checkout-service", state: "saturated", metricLabel: "Active instances", metricValue: "scaling to peak", explanation: "Scaling policy adds instances as CPU exceeds 70%." },
          { nodeId: "inventory-service", state: "saturated", metricLabel: "Active instances", metricValue: "scaling to peak", explanation: "Scaling policy adds instances alongside Checkout Service." },
        ],
        edgeEffects: [
          { edgeId: "checkout-service-postgres", state: "degraded", explanation: "Connection count rises with each new Checkout instance." },
          { edgeId: "inventory-service-postgres", state: "degraded", explanation: "Connection count rises with each new Inventory instance." },
        ],
        requirementImpacts: [],
      },
      {
        id: "stress-10x-spike-step-3",
        sequence: 3,
        title: "Postgres connection limit reached",
        description: "Combined connections from both scaled services approach the database's 500-connection ceiling.",
        nodeEffects: [
          { nodeId: "postgres", state: "saturated", metricLabel: "Active connections", metricValue: "500 / 500", explanation: "Two horizontally-scaled services share one fixed connection limit." },
        ],
        edgeEffects: [
          { edgeId: "checkout-service-postgres", state: "backlogged", explanation: "New connection attempts start queuing." },
          { edgeId: "inventory-service-postgres", state: "backlogged", explanation: "New connection attempts start queuing." },
        ],
        requirementImpacts: [{ requirementId: "req-throughput", status: "violated", observedValue: "new DB connections failing", explanation: "The connection ceiling caps effective throughput below demand." }],
      },
      {
        id: "stress-10x-spike-step-4",
        sequence: 4,
        title: "Checkout requests queue and fail",
        description: "Requests waiting on a database connection back up through Checkout Service and the gateway.",
        nodeEffects: [
          { nodeId: "checkout-service", state: "degraded", explanation: "Requests hold open waiting for a free database connection." },
        ],
        edgeEffects: [
          { edgeId: "api-gateway-checkout-service", state: "backlogged", explanation: "Checkout Service can no longer drain its inbound queue at the same rate." },
        ],
        requirementImpacts: [{ requirementId: "req-latency", status: "violated", observedValue: "p95 8.4s", explanation: "Requests wait behind the exhausted connection pool instead of completing quickly." }],
      },
    ],
  },
  {
    id: "stress-payment-degradation",
    name: "Payment provider degradation",
    description: "The external payment provider slows down significantly.",
    trigger: "Payment provider p99 latency rises from 1.8s to 15s.",
    affectedNodes: ["checkout-service", "payment-provider"],
    affectedEdges: ["checkout-service-payment-provider"],
    status: "fail",
    revealsRiskIds: ["risk-missing-timeout", "risk-payment-dependency"],
    expectedBehavior: "Checkout Service bounds how long it waits on the payment provider and sheds load gracefully.",
    observedBehavior: "Checkout Service worker capacity fills with requests waiting on the payment provider, and unrelated checkout requests begin queueing.",
    explanation: "With no timeout configured on the payment call, provider degradation propagates directly into checkout capacity exhaustion.",
    steps: [
      {
        id: "stress-payment-degradation-step-1",
        sequence: 1,
        title: "Payment provider latency rises",
        description: "The provider's p99 latency rises from 1.8s to 15s.",
        nodeEffects: [{ nodeId: "payment-provider", state: "degraded", metricLabel: "p99 latency", metricValue: "15s", explanation: "External provider is degraded outside Redline's control." }],
        edgeEffects: [{ edgeId: "checkout-service-payment-provider", state: "degraded", explanation: "Calls to the provider now take far longer to resolve." }],
        requirementImpacts: [],
      },
      {
        id: "stress-payment-degradation-step-2",
        sequence: 2,
        title: "Checkout requests remain open",
        description: "With no timeout configured on the payment call, Checkout Service keeps waiting instead of failing fast.",
        nodeEffects: [{ nodeId: "checkout-service", state: "degraded", explanation: "Worker threads stay blocked on the slow provider response." }],
        edgeEffects: [{ edgeId: "checkout-service-payment-provider", state: "backlogged", explanation: "No configured timeout means the connection stays open for the full provider delay." }],
        requirementImpacts: [],
      },
      {
        id: "stress-payment-degradation-step-3",
        sequence: 3,
        title: "Checkout worker capacity fills",
        description: "As more requests arrive, each holds a worker slot waiting on the provider, exhausting Checkout Service's capacity.",
        nodeEffects: [{ nodeId: "checkout-service", state: "saturated", metricLabel: "Active requests", metricValue: "3,000+", explanation: "Every request holds capacity for up to 15s instead of returning quickly." }],
        edgeEffects: [],
        requirementImpacts: [{ requirementId: "req-availability", status: "at_risk", explanation: "Checkout Service is close to unable to accept new requests." }],
      },
      {
        id: "stress-payment-degradation-step-4",
        sequence: 4,
        title: "Unrelated checkout requests queue behind the backlog",
        description: "New checkout requests, including ones that don't involve the slow provider, wait behind the saturated worker pool.",
        nodeEffects: [],
        edgeEffects: [{ edgeId: "api-gateway-checkout-service", state: "backlogged", explanation: "Checkout Service has no free capacity to accept new requests promptly." }],
        requirementImpacts: [{ requirementId: "req-latency", status: "violated", observedValue: "p95 4.2s", explanation: "Checkout holds the synchronous payment request open for the full provider response time." }],
      },
    ],
  },
  {
    id: "stress-regional-db-failure",
    name: "Regional database failure",
    description: "The region hosting the primary Postgres instance becomes unavailable.",
    trigger: "Simulated regional outage of the Orders DB's hosting region.",
    affectedNodes: ["postgres"],
    affectedEdges: [],
    status: "fail",
    revealsRiskIds: ["risk-single-region-persistence"],
    expectedBehavior: "Checkout recovers within the stated RTO with minimal data loss (within RPO).",
    observedBehavior: "No standby exists in another region; checkout remains unavailable until the primary region recovers, far exceeding the stated RTO.",
    explanation: "A single-region deployment cannot meet a regional-failure recovery objective by construction.",
    steps: [
      {
        id: "stress-regional-db-failure-step-1",
        sequence: 1,
        title: "Postgres's hosting region becomes unavailable",
        description: "The single region hosting the Orders DB primary goes down.",
        nodeEffects: [{ nodeId: "postgres", state: "unavailable", explanation: "The only deployed instance is in the failed region; no standby exists elsewhere." }],
        edgeEffects: [
          { edgeId: "checkout-service-postgres", state: "unavailable", explanation: "Checkout Service can no longer reach the database." },
          { edgeId: "inventory-service-postgres", state: "unavailable", explanation: "Inventory Service can no longer reach the database." },
        ],
        requirementImpacts: [],
      },
      {
        id: "stress-regional-db-failure-step-2",
        sequence: 2,
        title: "Checkout and inventory writes fail",
        description: "Order creation and inventory reservation both depend on the unreachable primary.",
        nodeEffects: [
          { nodeId: "checkout-service", state: "degraded", explanation: "Order writes fail with no reachable database." },
          { nodeId: "inventory-service", state: "degraded", explanation: "Reservation writes fail with no reachable database." },
        ],
        edgeEffects: [],
        requirementImpacts: [{ requirementId: "req-availability", status: "violated", observedValue: "checkout unavailable", explanation: "Checkout cannot complete any order without the Orders DB." }],
      },
      {
        id: "stress-regional-db-failure-step-3",
        sequence: 3,
        title: "No standby recovers checkout",
        description: "Recovery is only possible once the failed region itself recovers.",
        nodeEffects: [{ nodeId: "postgres", state: "unavailable", metricLabel: "Recovery time", metricValue: "exceeds 5 min target", explanation: "No documented replica or failover target exists in another region." }],
        edgeEffects: [],
        requirementImpacts: [
          { requirementId: "req-rto", status: "violated", observedValue: "recovery tied to region recovery", explanation: "Nothing in the design achieves a bounded recovery time during a regional outage." },
          { requirementId: "req-rpo", status: "violated", explanation: "Without a replicated standby, any writes since the last backup are at risk of loss." },
        ],
      },
    ],
  },
  {
    id: "stress-duplicate-checkout",
    name: "Duplicate checkout submission",
    description: "The client resubmits a checkout request, e.g. after a slow response or a double-click.",
    trigger: "The same checkout request is submitted twice in quick succession.",
    affectedNodes: ["checkout-service"],
    affectedEdges: ["checkout-service-payment-provider", "checkout-service-postgres"],
    status: "fail",
    revealsRiskIds: ["risk-payment-idempotency"],
    expectedBehavior: "The second submission is recognized as a duplicate and does not create a second charge or order.",
    observedBehavior: "Both submissions are processed independently, resulting in two payment captures and two order records for one cart.",
    explanation: "Without an idempotency key tying the request to the charge and order write, retries and resubmissions are indistinguishable from new orders.",
    steps: [
      {
        id: "stress-duplicate-checkout-step-1",
        sequence: 1,
        title: "Client retries the checkout request",
        description: "A slow response or double-click causes the same checkout request to be submitted twice.",
        nodeEffects: [{ nodeId: "checkout-service", state: "normal", explanation: "Both requests arrive as ordinary, independent checkout calls." }],
        edgeEffects: [],
        requirementImpacts: [],
      },
      {
        id: "stress-duplicate-checkout-step-2",
        sequence: 2,
        title: "Both requests reach the payment provider",
        description: "Checkout Service has no idempotency key to recognize the second request as a duplicate.",
        nodeEffects: [{ nodeId: "checkout-service", state: "degraded", explanation: "Nothing keys the charge to a single logical checkout attempt." }],
        edgeEffects: [{ edgeId: "checkout-service-payment-provider", state: "degraded", explanation: "Both requests independently call the payment provider." }],
        requirementImpacts: [{ requirementId: "req-process-payment", status: "violated", observedValue: "two captures for one cart", explanation: "The provider authorizes and captures payment twice for a single customer intent." }],
      },
      {
        id: "stress-duplicate-checkout-step-3",
        sequence: 3,
        title: "Duplicate order record is created",
        description: "Each request independently writes its own order record.",
        nodeEffects: [],
        edgeEffects: [{ edgeId: "checkout-service-postgres", state: "degraded", explanation: "Two separate order rows are written for the same cart." }],
        requirementImpacts: [{ requirementId: "req-create-order", status: "violated", observedValue: "two order records", explanation: "Retry safety requires an idempotency key tying the request to the order write, which is absent here." }],
      },
    ],
  },
  {
    id: "stress-poison-queue-message",
    name: "Poison queue message",
    description: "A malformed OrderCreated event that Order Worker cannot process enters the queue.",
    trigger: "One event fails deserialization or downstream processing in Order Worker.",
    affectedNodes: ["message-queue", "order-worker"],
    affectedEdges: ["message-queue-order-worker"],
    status: "fail",
    revealsRiskIds: ["risk-poison-message"],
    expectedBehavior: "The message is retried a bounded number of times, then moved aside so processing of other messages continues.",
    observedBehavior: "The message is redelivered indefinitely, and Order Worker spends increasing capacity retrying it.",
    explanation: "No dead-letter or max-redelivery policy is described for the queue/worker path.",
    steps: [
      {
        id: "stress-poison-queue-message-step-1",
        sequence: 1,
        title: "Order Worker consumes a failing message",
        description: "One OrderCreated event fails deserialization or downstream processing.",
        nodeEffects: [{ nodeId: "order-worker", state: "degraded", explanation: "The consumed message cannot be processed successfully." }],
        edgeEffects: [{ edgeId: "message-queue-order-worker", state: "degraded", explanation: "Delivery of this message does not complete successfully." }],
        requirementImpacts: [],
      },
      {
        id: "stress-poison-queue-message-step-2",
        sequence: 2,
        title: "The message is redelivered",
        description: "At-least-once delivery means the queue redelivers the failed message for another attempt.",
        nodeEffects: [{ nodeId: "message-queue", state: "degraded", explanation: "The undelivered-successfully message remains in the queue for redelivery." }],
        edgeEffects: [],
        requirementImpacts: [],
      },
      {
        id: "stress-poison-queue-message-step-3",
        sequence: 3,
        title: "Redelivery repeats without a dead-letter policy",
        description: "With no described max-redelivery or dead-letter handling, the same message is redelivered indefinitely.",
        nodeEffects: [{ nodeId: "order-worker", state: "saturated", metricLabel: "Retry attempts", metricValue: "unbounded", explanation: "Order Worker spends increasing capacity retrying a message it can never process." }],
        edgeEffects: [{ edgeId: "message-queue-order-worker", state: "backlogged", explanation: "Redelivery of the poison message competes with processing of other messages." }],
        requirementImpacts: [
          { requirementId: "req-create-order", status: "at_risk", explanation: "Order Worker capacity spent on the poison message slows fulfillment handoff for other orders." },
          { requirementId: "req-send-confirmation", status: "violated", observedValue: "confirmation for the failing order never sent", explanation: "No failure path exists to isolate the one order this message represents." },
        ],
      },
    ],
  },
];

const evaluationRubric: EvaluationRubric = {
  dimensions: [
    { key: "criticalRiskDetection", weight: 30, description: "Did the reviewer find the production risks that matter most?" },
    { key: "technicalReasoning", weight: 20, description: "Is the reasoning behind each finding technically sound?" },
    { key: "requirementAlignment", weight: 15, description: "Did the reviewer check the design against its stated requirements?" },
    { key: "tradeoffAnalysis", weight: 15, description: "Did the reviewer weigh tradeoffs rather than list issues in isolation?" },
    { key: "architectQuestioning", weight: 10, description: "Did the reviewer's questions to the architect probe the right assumptions? (evaluated once voice exists)" },
    { key: "finalDecision", weight: 10, description: "Was the final recommendation consistent with the findings? (evaluated once submission exists)" },
  ],
};

export const blackFridayCheckoutInternalScenario = InternalArchitectureScenarioSchema.parse({
  ...blackFridayCheckoutScenario,
  architectContext,
  hiddenRisks,
  stressTests,
  evaluationRubric,
});
