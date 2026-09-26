import type {
  ArchitectureDifficulty,
  ArchitectureFocus,
  ArchitectureNodeCategory,
  ArchitectureRiskCategory,
  RedlineSeverity,
} from "@redline/shared";

export const DIFFICULTY_LABELS: Record<ArchitectureDifficulty, string> = {
  mid: "Mid-Level",
  senior: "Senior",
  staff: "Staff",
};

export const FOCUS_LABELS: Record<ArchitectureFocus, string> = {
  reliability: "Reliability",
  scalability: "Scalability",
  "data-integrity": "Data Integrity",
  security: "Security",
  performance: "Performance",
  cost: "Cost",
};

export const NODE_CATEGORY_LABELS: Record<ArchitectureNodeCategory, string> = {
  client: "Client",
  gateway: "Gateway",
  "load-balancer": "Load Balancer",
  service: "Service",
  database: "Database",
  cache: "Cache",
  queue: "Queue",
  worker: "Worker",
  external: "External",
  observability: "Observability",
};

export const RISK_CATEGORY_LABELS: Record<ArchitectureRiskCategory, string> = {
  reliability: "Reliability",
  scalability: "Scalability",
  "data-integrity": "Data Integrity",
  security: "Security",
  performance: "Performance",
  operability: "Operability",
  resilience: "Resilience",
  cost: "Cost",
};

export const SEVERITY_LABELS: Record<RedlineSeverity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const SEVERITY_ORDER: RedlineSeverity[] = ["critical", "high", "medium", "low"];
