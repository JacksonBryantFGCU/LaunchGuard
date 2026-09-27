import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AddComponentModification,
  InterventionDefinition,
  StressProfile,
  StressSimulationRunRecord,
  StressTestTimelineResult,
} from "@redline/shared";
import { ApiError } from "../../lib/api/client.js";
import { getStressTestDefinitions, getStressRunHistory, runStressTest } from "./api.js";
import { initializeParameterValues, resetParameterValues, setParameterValue, type StressParameterValues } from "./parameterState.js";
import { groupRunsByTest, deriveBaselineRun } from "./runHistory.js";
import { isStrictComparison } from "./comparison.js";
import { classifyStressLabAvailability } from "./loadState.js";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready" } | { status: "unsupported" };
type RunRequestStatus = { status: "idle" } | { status: "submitting" } | { status: "error"; message: string };

export interface StressLabState {
  load: LoadState;
  testDefinitions: StressProfile[];
  interventions: InterventionDefinition[];
  selectedTest: StressProfile | undefined;
  selectTest: (testId: string) => void;
  parameterValues: StressParameterValues;
  parameterError: string | undefined;
  setParameter: (parameterId: string, value: number) => void;
  resetParameters: () => void;
  modifications: AddComponentModification[];
  setModifications: (mods: AddComponentModification[]) => void;
  runRequestStatus: RunRequestStatus;
  activeResult: StressTestTimelineResult | undefined;
  activeRun: StressSimulationRunRecord | undefined;
  runsForSelectedTest: StressSimulationRunRecord[];
  baselineRun: StressSimulationRunRecord | undefined;
  comparisonRun: StressSimulationRunRecord | undefined;
  runIsStrictComparison: boolean;
  runTest: () => Promise<void>;
  retryLoad: () => void;
}

/**
 * Orchestrates the Stress Lab page: API calls + the pure parameterState/
 * runHistory/comparison helpers. Not unit-tested directly (an effectful
 * integration hook, same as PracticeAttemptProvider) - its pure building
 * blocks are tested in parameterState.test.ts/runHistory.test.ts/
 * comparison.test.ts; this hook itself is covered by manual verification.
 */
export function useStressLab(reviewSessionId: string, practiceScenarioId: string): StressLabState {
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [testDefinitions, setTestDefinitions] = useState<StressProfile[]>([]);
  const [interventions, setInterventions] = useState<InterventionDefinition[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<string | undefined>(undefined);
  const [parameterValues, setParameterValues] = useState<StressParameterValues>({});
  const [parameterError, setParameterError] = useState<string | undefined>(undefined);
  const [modifications, setModifications] = useState<AddComponentModification[]>([]);
  const [runRequestStatus, setRunRequestStatus] = useState<RunRequestStatus>({ status: "idle" });
  const [activeResult, setActiveResult] = useState<StressTestTimelineResult | undefined>(undefined);
  const [activeRun, setActiveRun] = useState<StressSimulationRunRecord | undefined>(undefined);
  const [runHistory, setRunHistory] = useState<StressSimulationRunRecord[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    // Resets loading state when reviewSessionId/practiceScenarioId change, not just on mount (mirrors PracticeAttemptProvider's identical pattern).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoad({ status: "loading" });
    Promise.all([getStressTestDefinitions(reviewSessionId, practiceScenarioId), getStressRunHistory(reviewSessionId, practiceScenarioId)])
      .then(([defs, history]) => {
        if (cancelled) return;
        setTestDefinitions(defs.testDefinitions);
        setInterventions(defs.interventions);
        setRunHistory(history);
        const firstTest = defs.testDefinitions[0];
        if (firstTest) {
          setSelectedTestId(firstTest.id);
          setParameterValues(initializeParameterValues(firstTest));
        }
        // A defined-but-empty testDefinitions array is a genuine 200
        // response (this scenario intentionally has no Stress Lab test
        // yet) - never confused with a 404/network failure, which lands in
        // the catch block below instead (spec #10).
        setLoad({ status: classifyStressLabAvailability(defs.testDefinitions.length) === "ready" ? "ready" : "unsupported" });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoad({ status: "error", message: err instanceof ApiError ? err.message : "Stress tests could not be loaded." });
      });
    return () => {
      cancelled = true;
    };
  }, [reviewSessionId, practiceScenarioId, retryCount]);

  const retryLoad = useCallback(() => setRetryCount((c) => c + 1), []);

  const selectedTest = testDefinitions.find((t) => t.id === selectedTestId);

  const selectTest = useCallback(
    (testId: string) => {
      const test = testDefinitions.find((t) => t.id === testId);
      if (!test) return;
      setSelectedTestId(testId);
      setParameterValues(initializeParameterValues(test));
      setParameterError(undefined);
      // Clears the active timeline, but never touches modifications or history (spec #45): the learner is testing the same current architecture against different conditions.
      setActiveResult(undefined);
      setActiveRun(undefined);
    },
    [testDefinitions],
  );

  const setParameter = useCallback(
    (parameterId: string, value: number) => {
      if (!selectedTest) return;
      const result = setParameterValue(parameterValues, selectedTest, parameterId, value);
      setParameterValues(result.values);
      setParameterError(result.error);
    },
    [selectedTest, parameterValues],
  );

  const resetParameters = useCallback(() => {
    if (!selectedTest) return;
    setParameterValues(resetParameterValues(selectedTest));
    setParameterError(undefined);
  }, [selectedTest]);

  const runTest = useCallback(async () => {
    if (!selectedTest) return;
    setRunRequestStatus({ status: "submitting" });
    try {
      const { run, result } = await runStressTest(reviewSessionId, practiceScenarioId, selectedTest.id, parameterValues, modifications);
      setActiveRun(run);
      setActiveResult(result);
      setRunHistory((prev) => [...prev, run]);
      setRunRequestStatus({ status: "idle" });
    } catch (err) {
      setRunRequestStatus({ status: "error", message: err instanceof ApiError ? err.message : "The stress test could not be started." });
    }
  }, [reviewSessionId, practiceScenarioId, selectedTest, parameterValues, modifications]);

  const runsByTest = useMemo(() => groupRunsByTest(runHistory), [runHistory]);
  const runsForSelectedTest = selectedTestId ? (runsByTest[selectedTestId] ?? []) : [];
  const baselineRun = deriveBaselineRun(runsForSelectedTest);
  // Only the second-and-later run for a test has anything to compare against (spec #37).
  const comparisonRun = activeRun && baselineRun && activeRun.id !== baselineRun.id ? baselineRun : undefined;
  const runIsStrictComparison =
    !!activeRun && !!comparisonRun && isStrictComparison(comparisonRun.testId, comparisonRun.parameters, activeRun.testId, activeRun.parameters);

  return {
    load,
    testDefinitions,
    interventions,
    selectedTest,
    selectTest,
    parameterValues,
    parameterError,
    setParameter,
    resetParameters,
    modifications,
    setModifications,
    runRequestStatus,
    activeResult,
    activeRun,
    runsForSelectedTest,
    baselineRun,
    comparisonRun,
    runIsStrictComparison,
    runTest,
    retryLoad,
  };
}
