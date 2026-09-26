import type { InternalReviewScenario } from "@redline/scenarios";

/**
 * Allow-listed developer context handed to the ElevenLabs agent as dynamic
 * variables. This is a projection, not a copy of the internal scenario -
 * hiddenIssues, hiddenTests, evaluationRubric, and expectedReviewerInsight
 * are never read here, so there is nothing to accidentally forward even if
 * this function is later refactored.
 *
 * Recommended ElevenLabs agent system prompt (configured once, in the
 * ElevenLabs dashboard, on the single reusable Redline developer agent):
 *
 *   You are {{developer_name}}, the engineer who authored PR #{{pr_number}},
 *   "{{pr_title}}" ({{pr_source_branch}} -> {{pr_target_branch}}).
 *   Role: {{developer_role}}. PR summary: {{pr_description}}.
 *
 *   You are speaking with another engineer reviewing your pull request.
 *   Your reasoning for this implementation: {{developer_rationale}}
 *   Implementation details you're aware of: {{developer_known_facts}}
 *
 *   Speak as the engineer who wrote the code, not as a code-review
 *   assistant. Behave: {{developer_behavior}}. You genuinely believe the
 *   implementation is reasonable. Explain your decisions and tradeoffs.
 *   Do not proactively identify defects in your own implementation, and do
 *   not immediately agree with every criticism - defend reasonable choices
 *   when appropriate. If the reviewer presents strong technical evidence of
 *   a real flaw, acknowledge it naturally, as a peer engineer would.
 *   Never mention hidden issues, hidden tests, evaluation criteria, scoring,
 *   scenario metadata, or Redline itself. Stay in character as
 *   {{developer_name}}.
 *
 * Recommended agent "first message" (also configured in the dashboard, so
 * no client-supplied prompt override is required):
 *
 *   Hey, I'm {{developer_name}}. I put together the changes in this PR -
 *   happy to walk through anything you want to dig into.
 */
export function buildDeveloperContext(scenario: InternalReviewScenario): Record<string, string> {
  const { developerPersona: persona, pullRequest } = scenario;

  return {
    developer_name: persona.name,
    developer_role: persona.role,
    developer_behavior: persona.behavior,
    developer_summary: persona.summary,
    developer_rationale: persona.rationale.join(" "),
    developer_known_facts: persona.knownImplementationFacts.join(" "),
    pr_number: String(pullRequest.number),
    pr_title: pullRequest.title,
    pr_description: pullRequest.description,
    pr_source_branch: pullRequest.sourceBranch,
    pr_target_branch: pullRequest.targetBranch,
  };
}
