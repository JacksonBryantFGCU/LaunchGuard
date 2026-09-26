import type { Rule } from "../engine.js";

export const missingEnvExample: Rule = {
  id: "missing-env-example",
  name: "Missing .env.example",
  description: "Checks that the project documents its required environment variables.",
  category: "configuration",
  defaultSeverity: "medium",
  evaluate(context) {
    if (context.project.hasEnvExample) return null;
    return {
      ruleId: this.id,
      title: "No .env.example found",
      severity: this.defaultSeverity,
      category: this.category,
      explanation:
        "The project does not provide a .env.example file, making it harder for other developers or deployment environments to know which environment variables are required.",
      remediation: "Add a .env.example file listing every environment variable the app reads, with placeholder values.",
      evidence: [{ description: "project.hasEnvExample is false" }],
    };
  },
};
