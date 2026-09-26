import type { Rule } from "../engine.js";
import { hasServerFramework } from "../evidence.js";

export const missingNodeEngine: Rule = {
  id: "missing-node-engine",
  name: "Missing Node engine specification",
  description: "Checks that a deployable Node service pins a supported Node engine range.",
  category: "dependencies",
  defaultSeverity: "low",
  evaluate({ analysis }) {
    if (!hasServerFramework(analysis)) return null;
    if (analysis.manifest?.engines.node) return null;

    return {
      ruleId: this.id,
      title: "No Node engine version specified",
      severity: this.defaultSeverity,
      category: this.category,
      explanation:
        "A server framework was detected, but package.json does not specify an \"engines.node\" range, which can lead to inconsistent Node versions across environments.",
      remediation: "Add an \"engines.node\" field to package.json pinning a supported Node.js version range.",
      evidence: [{ description: "package.json has no engines.node field.", file: "package.json" }],
    };
  },
};
