import type {
  ArchitectureModification,
  InterventionDefinition,
  StressParameterValues,
  StressProfile,
  StressTestTimelineResult,
} from "@purgatory/shared";
import { getStressLabDefinition, runStressLabSimulation } from "@purgatory/scenarios/internal";
import type { ReviewRepository } from "./reviewRepository.js";
import { requireOwnedSession } from "./reviewSessionService.js";
import type { PracticeScenarioRepository, StressSimulationRunRecord } from "./practiceScenarioRepository.js";

export type StressServiceFailure = { ok: false; status: number; error: string; message: string };
export type StressServiceResult<T> = { ok: true; result: T } | StressServiceFailure;

const notFound = (message: string): StressServiceFailure => ({ ok: false, status: 404, error: "not_found", message });

/**
 * Shared ownership + "has this scenario been started" check every stress
 * endpoint needs. Mirrors getStressTestsForReview's ownership boundary:
 * only the verified owner may reach a scenario's stress lab, and only once
 * an attempt exists (never lets a client probe an unstarted scenario).
 */
async function requireStartedAttempt(
  reviewRepo: ReviewRepository,
  practiceRepo: PracticeScenarioRepository,
  userId: string,
  reviewSessionId: string,
  practiceScenarioId: string,
): Promise<{ ok: true; attemptId: string } | StressServiceFailure> {
  const owned = await requireOwnedSession(reviewRepo, userId, reviewSessionId);
  if (!owned.ok) return owned;

  const attempt = await practiceRepo.getPracticeScenarioAttempt(reviewSessionId, practiceScenarioId);
  if (!attempt) return notFound("This practice scenario has not been started yet.");
  return { ok: true, attemptId: attempt.id };
}

export interface StressLabDefinitionView {
  testDefinitions: StressProfile[];
  interventions: InterventionDefinition[];
}

export async function getStressTestDefinitions(
  reviewRepo: ReviewRepository,
  practiceRepo: PracticeScenarioRepository,
  userId: string,
  reviewSessionId: string,
  practiceScenarioId: string,
): Promise<StressServiceResult<StressLabDefinitionView>> {
  const started = await requireStartedAttempt(reviewRepo, practiceRepo, userId, reviewSessionId, practiceScenarioId);
  if (!started.ok) return started;

  const lab = getStressLabDefinition(practiceScenarioId);
  if (!lab) return notFound("This practice scenario has no stress lab.");
  return { ok: true, result: lab };
}

export interface RunStressSimulationOutcome {
  run: StressSimulationRunRecord;
  result: StressTestTimelineResult;
}

export async function runStressSimulation(
  reviewRepo: ReviewRepository,
  practiceRepo: PracticeScenarioRepository,
  userId: string,
  reviewSessionId: string,
  practiceScenarioId: string,
  testId: string,
  parameters: StressParameterValues,
  modifications: ArchitectureModification[],
): Promise<StressServiceResult<RunStressSimulationOutcome>> {
  const started = await requireStartedAttempt(reviewRepo, practiceRepo, userId, reviewSessionId, practiceScenarioId);
  if (!started.ok) return started;

  const result = runStressLabSimulation(practiceScenarioId, testId, parameters, modifications);
  if (!result) return notFound("Unknown stress test id for this scenario.");

  const run = await practiceRepo.saveStressSimulationRun(started.attemptId, {
    testId,
    parameters,
    modifications,
    passed: result.passed,
    finalMetrics: result.finalMetrics,
    requirementResults: result.requirementResults,
    bottlenecks: result.bottlenecks,
    summary: result.summary,
  });

  return { ok: true, result: { run, result } };
}

export async function listStressSimulationRuns(
  reviewRepo: ReviewRepository,
  practiceRepo: PracticeScenarioRepository,
  userId: string,
  reviewSessionId: string,
  practiceScenarioId: string,
): Promise<StressServiceResult<StressSimulationRunRecord[]>> {
  const started = await requireStartedAttempt(reviewRepo, practiceRepo, userId, reviewSessionId, practiceScenarioId);
  if (!started.ok) return started;

  return { ok: true, result: await practiceRepo.listStressSimulationRuns(started.attemptId) };
}
