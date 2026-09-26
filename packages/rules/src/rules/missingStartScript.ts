import type { Rule } from "../engine.js";

export const missingStartScript: Rule = {
  id: "missing-start-script",
  name: "Missing application start script",
  description: "Checks that the project declares a script to run the application.",
  category: "operability",
  defaultSeverity: "high",
  evaluate(context) {
    if (context.project.hasStartScript) return null;
    return {
      ruleId: this.id,
      title: "No application start script configured",
      severity: this.defaultSeverity,
      category: this.category,
      explanation:
        "The project does not declare a start script, so it is unclear how the application is launched once deployed.",
      remediation: "Add a start script (e.g. \"start\") that runs the built application.",
      evidence: [{ description: "project.hasStartScript is false" }],
    };
  },
};
