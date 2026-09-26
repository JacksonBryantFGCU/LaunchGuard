import type { Rule } from "../engine.js";
import { hasConfigKind, hasServerFramework } from "../evidence.js";

export const missingEnvExample: Rule = {
  id: "missing-env-example",
  name: "Missing .env.example",
  description: "Checks that a project that plausibly needs environment configuration documents it.",
  category: "configuration",
  defaultSeverity: "medium",
  evaluate({ analysis }) {
    const usesDotenv = "dotenv" in { ...analysis.manifest?.dependencies, ...analysis.manifest?.devDependencies };
    const relevant = analysis.project.isNodeProject && (hasServerFramework(analysis) || usesDotenv);
    if (!relevant) return null;
    if (hasConfigKind(analysis, "env-example")) return null;

    return {
      ruleId: this.id,
      title: "No .env.example found",
      severity: this.defaultSeverity,
      category: this.category,
      explanation:
        "This project has evidence of environment-dependent configuration (a server framework or dotenv) but no .env.example, making it harder for others to know which environment variables are required.",
      remediation: "Add a .env.example file listing every environment variable the app reads, with placeholder values.",
      evidence: [{ description: "No .env.example or .env.sample present despite server/dotenv evidence." }],
    };
  },
};
