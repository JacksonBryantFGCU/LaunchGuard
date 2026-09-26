import type { Rule } from "../engine.js";

export const potentialSecretCommitted: Rule = {
  id: "potential-secret-committed",
  name: "Possible committed secret",
  description: "Checks for high-confidence secret patterns (AWS keys, GitHub tokens, private key blocks, etc.) in small config files.",
  category: "security",
  defaultSeverity: "critical",
  evaluate({ analysis }) {
    if (analysis.potentialSecrets.length === 0) return null;

    return {
      ruleId: this.id,
      title: "Possible secret committed to the repository",
      severity: this.defaultSeverity,
      category: this.category,
      explanation:
        "Text matching a known secret format (e.g. an AWS access key, GitHub token, Slack token, or private key header) was found in a committed file. The value itself is never surfaced.",
      remediation: "Remove the secret from version control, rotate it immediately, and load it from environment configuration instead.",
      evidence: analysis.potentialSecrets.map((s) => ({ description: `Matched pattern: ${s.pattern} (value redacted)`, file: s.file })),
    };
  },
};
