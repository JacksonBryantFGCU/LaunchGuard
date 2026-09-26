import type { Rule } from "../engine.js";
import { hasServerFramework } from "../evidence.js";

export const missingStartScript: Rule = {
  id: "missing-start-script",
  name: "Missing application start script",
  description: "Checks that a detected server application declares a script to run it.",
  category: "operability",
  defaultSeverity: "high",
  evaluate({ analysis }) {
    if (!hasServerFramework(analysis)) return null;
    if (analysis.manifest?.scripts.start) return null;

    return {
      ruleId: this.id,
      title: "No application start script configured",
      severity: this.defaultSeverity,
      category: this.category,
      explanation:
        "A server framework was detected, but the project does not declare a start script, so it is unclear how the application is launched once deployed.",
      remediation: "Add a \"start\" script that runs the built/production server.",
      evidence: [{ description: "package.json has no \"start\" script.", file: "package.json" }],
    };
  },
};
