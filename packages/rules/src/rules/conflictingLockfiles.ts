import type { Rule } from "../engine.js";

const LOCKFILE_KINDS = new Set(["lockfile-npm", "lockfile-pnpm", "lockfile-yarn", "lockfile-bun"]);

export const conflictingLockfiles: Rule = {
  id: "conflicting-lockfiles",
  name: "Conflicting package-manager lockfiles",
  description: "Checks that only one package-manager lockfile is present.",
  category: "dependencies",
  defaultSeverity: "medium",
  evaluate({ analysis }) {
    if (!analysis.project.isNodeProject) return null;
    const lockfiles = analysis.configuration.filter((c) => LOCKFILE_KINDS.has(c.kind));
    if (lockfiles.length <= 1) return null;

    return {
      ruleId: this.id,
      title: "Multiple package-manager lockfiles present",
      severity: this.defaultSeverity,
      category: this.category,
      explanation:
        "More than one package-manager lockfile was found. This usually means contributors are using different package managers, which can lead to inconsistent installs.",
      remediation: "Pick a single package manager, commit only its lockfile, and remove the others.",
      evidence: lockfiles.map((l) => ({ description: `Lockfile detected: ${l.kind}`, file: l.path })),
    };
  },
};
