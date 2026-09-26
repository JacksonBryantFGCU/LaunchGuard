import type { Rule } from "../engine.js";

export const broadCorsConfig: Rule = {
  id: "broad-cors-config",
  name: "Suspiciously broad CORS configuration",
  description: "Checks for a literal wildcard CORS origin in a common server entrypoint file.",
  category: "security",
  defaultSeverity: "high",
  evaluate({ analysis }) {
    const files = analysis.signals.corsWildcardFiles;
    if (files.length === 0) return null;

    return {
      ruleId: this.id,
      title: "CORS appears to allow all origins",
      severity: this.defaultSeverity,
      category: this.category,
      explanation:
        "A wildcard CORS origin (or a bare cors() call with no origin restriction) was found in a server entrypoint, which allows any website to make requests against the API.",
      remediation: "Restrict CORS to an explicit allowlist of trusted origins instead of using a wildcard.",
      evidence: files.map((file) => ({ description: "Wildcard CORS pattern found in this file.", file })),
    };
  },
};
