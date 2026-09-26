import type { Rule } from "../engine.js";

const DEV_ONLY_PATTERN = /\b(nodemon|--watch|\bdev\b|ts-node-dev)\b/i;

export const devScriptInStart: Rule = {
  id: "dev-script-in-start",
  name: "Development-only command used as the start script",
  description: "Checks that the start script does not invoke an obvious development-only tool.",
  category: "reliability",
  defaultSeverity: "medium",
  evaluate({ analysis }) {
    const start = analysis.manifest?.scripts.start;
    if (!start) return null;
    if (!DEV_ONLY_PATTERN.test(start)) return null;

    return {
      ruleId: this.id,
      title: "Start script looks like a development command",
      severity: this.defaultSeverity,
      category: this.category,
      explanation:
        "The \"start\" script invokes a development-only tool (such as nodemon or a --watch flag), which is typically unsuitable for a production process.",
      remediation: "Use a production-appropriate start command (e.g. running the built output directly with node).",
      evidence: [{ description: `start script: "${start}"`, file: "package.json" }],
    };
  },
};
