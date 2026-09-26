import type { Finding, FindingCategory, FindingSeverity, RuleContext, RuleResult } from "@launchguard/shared";

export interface Rule {
  id: string;
  name: string;
  description: string;
  category: FindingCategory;
  defaultSeverity: FindingSeverity;
  evaluate(context: RuleContext): RuleResult;
}

export function runRules(rules: Rule[], context: RuleContext): Finding[] {
  return rules
    .map((rule) => rule.evaluate(context))
    .filter((result): result is Finding => result !== null);
}
