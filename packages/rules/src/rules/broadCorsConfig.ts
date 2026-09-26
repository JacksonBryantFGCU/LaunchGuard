import type { Rule } from "../engine.js";

export const broadCorsConfig: Rule = {
  id: "broad-cors-config",
  name: "Suspiciously broad CORS configuration",
  description: "Checks that the project does not allow all origins via CORS.",
  category: "security",
  defaultSeverity: "high",
  evaluate(context) {
    const origins = context.project.corsOrigins;
    if (!origins || !origins.includes("*")) return null;
    return {
      ruleId: this.id,
      title: "CORS allows all origins",
      severity: this.defaultSeverity,
      category: this.category,
      explanation:
        "The project's CORS configuration includes a wildcard origin (\"*\"), which allows any website to make authenticated requests against the API.",
      remediation: "Restrict CORS to an explicit allowlist of trusted origins instead of using a wildcard.",
      evidence: [{ description: "project.corsOrigins includes \"*\"" }],
    };
  },
};
