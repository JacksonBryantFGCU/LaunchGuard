import type { Rule } from "../engine.js";
import { hasConfigKind } from "../evidence.js";

export const missingGitignore: Rule = {
  id: "missing-gitignore",
  name: "Missing .gitignore",
  description: "Checks that the repository declares a .gitignore file.",
  category: "configuration",
  defaultSeverity: "low",
  evaluate({ analysis }) {
    if (hasConfigKind(analysis, "gitignore")) return null;

    return {
      ruleId: this.id,
      title: "No .gitignore found",
      severity: this.defaultSeverity,
      category: this.category,
      explanation:
        "The repository does not have a .gitignore file, which makes it easy to accidentally commit build output, dependencies, or local secrets.",
      remediation: "Add a .gitignore file covering dependency directories, build output, and local environment files.",
      evidence: [{ description: "No file named .gitignore was found at the repository root." }],
    };
  },
};
