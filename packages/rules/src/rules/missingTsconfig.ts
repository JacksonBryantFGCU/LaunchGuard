import type { Rule } from "../engine.js";
import { hasConfigKind, usesTypeScript } from "../evidence.js";

export const missingTsconfig: Rule = {
  id: "missing-tsconfig",
  name: "Missing TypeScript configuration",
  description: "Checks that a project with TypeScript source files has a tsconfig.json.",
  category: "configuration",
  defaultSeverity: "medium",
  evaluate({ analysis }) {
    if (!usesTypeScript(analysis)) return null;
    if (hasConfigKind(analysis, "tsconfig")) return null;

    return {
      ruleId: this.id,
      title: "No tsconfig.json found",
      severity: this.defaultSeverity,
      category: this.category,
      explanation: "TypeScript source files were detected, but the repository has no tsconfig.json.",
      remediation: "Add a tsconfig.json so TypeScript compilation and editor tooling behave consistently.",
      evidence: [{ description: "TypeScript files are present but no tsconfig.json was found." }],
    };
  },
};
