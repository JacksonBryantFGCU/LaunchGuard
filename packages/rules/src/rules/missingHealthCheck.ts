import type { Rule } from "../engine.js";
import { hasFilePathContaining, hasServerFramework } from "../evidence.js";

export const missingHealthCheck: Rule = {
  id: "missing-health-check",
  name: "Missing health-check configuration",
  description: "Checks that a detected server application has some evidence of a health-check endpoint.",
  category: "reliability",
  defaultSeverity: "medium",
  evaluate({ analysis }) {
    if (!hasServerFramework(analysis)) return null;
    if (hasFilePathContaining(analysis, "health")) return null;

    return {
      ruleId: this.id,
      title: "No health-check configuration found",
      severity: this.defaultSeverity,
      category: this.category,
      explanation:
        "A server framework was detected, but no file in the repository suggests a health-check endpoint, making it harder for orchestration or monitoring tools to determine liveness.",
      remediation: "Expose a health-check endpoint (e.g. GET /health) and keep it discoverable in the codebase.",
      evidence: [{ description: "No file path in the repository contains \"health\"." }],
    };
  },
};
