import type { InternalArchitectureScenario } from "@purgatory/scenarios/internal";
import type { VoiceSessionFocus } from "@purgatory/shared";

function bulletList(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

function formatRequirements(scenario: InternalArchitectureScenario): string {
  return bulletList(
    scenario.requirements.map((r) => `[${r.area}] ${r.summary}${r.target ? ` (target: ${r.target})` : ""}`),
  );
}

function formatConstraints(scenario: InternalArchitectureScenario): string {
  return bulletList(scenario.constraints.map((c) => c.summary));
}

function formatArchitecture(scenario: InternalArchitectureScenario): string {
  const nodeLines = scenario.nodes.map((node) => {
    const details = scenario.componentDetails.find((d) => d.nodeId === node.id);
    const responsibilities = details?.responsibilities.length ? ` Responsibilities: ${details.responsibilities.join(", ")}.` : "";
    return `- ${node.label} (${node.category}): ${node.summary}${responsibilities}`;
  });

  const edgeLines = scenario.edges.map((edge) => {
    const source = scenario.nodes.find((n) => n.id === edge.source)?.label ?? edge.source;
    const target = scenario.nodes.find((n) => n.id === edge.target)?.label ?? edge.target;
    const details = scenario.connectionDetails.find((d) => d.edgeId === edge.id);
    const extras = [
      details?.timeout ? `timeout: ${details.timeout}` : null,
      details?.retryPolicy ? `retries: ${details.retryPolicy}` : null,
      details?.consistency ? `consistency: ${details.consistency}` : null,
    ]
      .filter(Boolean)
      .join(", ");
    return `- ${source} -> ${target} (${edge.protocol}, ${edge.mode})${extras ? `: ${extras}` : ""}`;
  });

  return `Components:\n${nodeLines.join("\n")}\n\nConnections:\n${edgeLines.join("\n")}`;
}

/**
 * Allow-list projection of an internal scenario into what the architect
 * agent may know at runtime. Reads only public architecture/requirement
 * facts plus architectContext (background/behavior/assumptions/rationale/
 * tradeoffs) - never scenario.hiddenRisks, scenario.stressTests, or
 * scenario.evaluationRubric, which this function does not reference at all.
 *
 * ElevenLabs' dynamic-variable values must be flat strings/numbers/booleans,
 * so every value here is pre-formatted text for prompt interpolation.
 */
export function buildArchitectConversationContext(scenario: InternalArchitectureScenario): Record<string, string> {
  return {
    architect_name: scenario.architect.name,
    architect_role: scenario.architect.role,
    scenario_title: scenario.title,
    review_code: scenario.reviewCode,
    system_summary: scenario.description,
    requirements_context: formatRequirements(scenario),
    constraints_context: formatConstraints(scenario),
    architecture_context: formatArchitecture(scenario),
    architect_background: scenario.architectContext.background,
    architect_behavior: scenario.architectContext.behavior,
    architect_assumptions: bulletList(scenario.architectContext.assumptions),
    architect_rationale: bulletList(scenario.architectContext.rationale),
    architect_tradeoffs: bulletList(scenario.architectContext.knownTradeoffs),
  };
}

/**
 * Merges the learner's current Stress Lab focus (spec #14) into the
 * dynamic-variable set. Only ever forwards the plain-text fields the
 * frontend already sent - this function has no access to
 * scenario.hiddenRisks/stressTests/evaluationRubric and cannot leak them.
 * ElevenLabs requires every dynamic-variable value be a plain string, so an
 * absent field becomes "" rather than being omitted (never invented text).
 */
export function buildStressLabFocusVariables(focus: VoiceSessionFocus | undefined): Record<string, string> {
  return {
    stress_focus_component: focus?.focusLabel ?? "",
    stress_focus_bottleneck: focus?.bottleneckSummary ?? "",
    stress_focus_requirement: focus?.requirementSummary ?? "",
    stress_focus_metrics: focus?.metricsSummary ?? "",
  };
}
