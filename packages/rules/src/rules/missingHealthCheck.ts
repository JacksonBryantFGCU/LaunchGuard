import type { Rule } from "../engine.js";

export const missingHealthCheck: Rule = {
  id: "missing-health-check",
  name: "Missing health-check configuration",
  description: "Checks that the project exposes health-check configuration or metadata.",
  category: "reliability",
  defaultSeverity: "medium",
  evaluate(context) {
    if (context.project.hasHealthCheck) return null;
    return {
      ruleId: this.id,
      title: "No health-check configuration found",
      severity: this.defaultSeverity,
      category: this.category,
      explanation:
        "The project does not declare a health-check endpoint or configuration, making it harder for orchestration or monitoring tools to determine liveness.",
      remediation: "Expose a health-check endpoint (e.g. GET /health) and document it in project metadata.",
      evidence: [{ description: "project.hasHealthCheck is false" }],
    };
  },
};
