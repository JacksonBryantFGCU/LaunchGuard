import type { Rule } from "../engine.js";

export const missingBuildScript: Rule = {
  id: "missing-build-script",
  name: "Missing production build script",
  description: "Checks that the project declares a script to produce a production build.",
  category: "operability",
  defaultSeverity: "high",
  evaluate(context) {
    if (context.project.hasBuildScript) return null;
    return {
      ruleId: this.id,
      title: "No production build script configured",
      severity: this.defaultSeverity,
      category: this.category,
      explanation:
        "The project does not declare a build script, so it is unclear how a production artifact is produced before deployment.",
      remediation: "Add a build script (e.g. \"build\") that compiles or bundles the application for production.",
      evidence: [{ description: "project.hasBuildScript is false" }],
    };
  },
};
