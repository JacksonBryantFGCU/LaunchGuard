import { z } from "zod";
import {
  StressProfileSchema,
  InterventionDefinitionSchema,
  StressTestTimelineResultSchema,
  StressSimulationRunRecordSchema,
  type StressProfile,
  type InterventionDefinition,
  type StressTestTimelineResult,
  type StressSimulationRunRecord,
  type ArchitectureModification,
  type StressParameterValues,
} from "@redline/shared";
import { apiGet, apiPost } from "../../lib/api/client.js";

const basePath = (reviewSessionId: string, practiceScenarioId: string) =>
  `/api/review-sessions/${encodeURIComponent(reviewSessionId)}/practice-scenarios/${encodeURIComponent(practiceScenarioId)}`;

const StressTestDefinitionsResponseSchema = z.object({
  testDefinitions: z.array(StressProfileSchema),
  interventions: z.array(InterventionDefinitionSchema),
});
export interface StressTestDefinitionsResponse {
  testDefinitions: StressProfile[];
  interventions: InterventionDefinition[];
}

export function getStressTestDefinitions(reviewSessionId: string, practiceScenarioId: string): Promise<StressTestDefinitionsResponse> {
  return apiGet(`${basePath(reviewSessionId, practiceScenarioId)}/stress-tests`, (data) => StressTestDefinitionsResponseSchema.parse(data), {
    authed: true,
  });
}

const RunStressTestResponseSchema = z.object({
  run: StressSimulationRunRecordSchema,
  result: StressTestTimelineResultSchema,
});
export interface RunStressTestResponse {
  run: StressSimulationRunRecord;
  result: StressTestTimelineResult;
}

export function runStressTest(
  reviewSessionId: string,
  practiceScenarioId: string,
  testId: string,
  parameters: StressParameterValues,
  modifications: ArchitectureModification[],
): Promise<RunStressTestResponse> {
  return apiPost(
    `${basePath(reviewSessionId, practiceScenarioId)}/stress-runs`,
    { testId, parameters, modifications },
    (data) => RunStressTestResponseSchema.parse(data),
    { authed: true },
  );
}

export function getStressRunHistory(reviewSessionId: string, practiceScenarioId: string): Promise<StressSimulationRunRecord[]> {
  return apiGet(`${basePath(reviewSessionId, practiceScenarioId)}/stress-runs`, (data) => z.array(StressSimulationRunRecordSchema).parse(data), {
    authed: true,
  });
}
