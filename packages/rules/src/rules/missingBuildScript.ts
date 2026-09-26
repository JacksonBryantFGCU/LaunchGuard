import type { Rule } from "../engine.js";
import { hasBundlerLikeFramework } from "../evidence.js";

export const missingBuildScript: Rule = {
  id: "missing-build-script",
  name: "Missing production build script",
  description: "Checks that a project which plausibly needs a compile/bundle step declares a build script.",
  category: "operability",
  defaultSeverity: "high",
  evaluate({ analysis }) {
    const usesTypeScript = "typescript" in { ...analysis.manifest?.dependencies, ...analysis.manifest?.devDependencies };
    const relevant = analysis.project.isNodeProject && (hasBundlerLikeFramework(analysis) || usesTypeScript);
    if (!relevant) return null;
    if (analysis.manifest?.scripts.build) return null;

    return {
      ruleId: this.id,
      title: "No production build script configured",
      severity: this.defaultSeverity,
      category: this.category,
      explanation:
        "This project uses TypeScript or a bundler-based framework but does not declare a build script, so it is unclear how a production artifact is produced.",
      remediation: "Add a \"build\" script that compiles or bundles the application for production.",
      evidence: [{ description: "package.json has no \"build\" script.", file: "package.json" }],
    };
  },
};
