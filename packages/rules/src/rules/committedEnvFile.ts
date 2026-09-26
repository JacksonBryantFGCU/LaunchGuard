import type { Rule } from "../engine.js";
import { hasConfigKind } from "../evidence.js";

export const committedEnvFile: Rule = {
  id: "committed-env-file",
  name: "Committed .env file",
  description: "Checks that a real .env file (as opposed to .env.example) is not committed to the repository.",
  category: "security",
  defaultSeverity: "critical",
  evaluate({ analysis }) {
    if (!hasConfigKind(analysis, "env-file")) return null;

    return {
      ruleId: this.id,
      title: "A .env file is committed to the repository",
      severity: this.defaultSeverity,
      category: this.category,
      explanation:
        "A .env file was found in the repository. Committed .env files commonly contain real secrets and should never be checked into version control.",
      remediation: "Remove the .env file from version control, rotate any secrets it may have contained, and add .env to .gitignore.",
      evidence: [{ description: "A file named .env is present in the repository.", file: ".env" }],
    };
  },
};
