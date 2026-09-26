export type StressTestRunStatus = "not_started" | "running" | "passed" | "failed";

// Simulator playback state only - never the submitted review itself, which
// stays locked and untouched by anything here.
export interface StressTestSimulatorState {
  selectedTestId: string | null;
  testStatuses: Record<string, StressTestRunStatus>;
  currentStepIndex: number;
  isPlaying: boolean;
  completedTestIds: string[];
}

export type StressTestSimulatorAction =
  | { type: "SELECT_TEST"; testId: string }
  | { type: "START_TEST" }
  | { type: "ADVANCE_STEP"; stepCount: number; finalStatus: "pass" | "fail" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "RESTART_TEST" }
  | { type: "FINISH_TEST"; finalStatus: "pass" | "fail" }
  | { type: "HYDRATE_PROGRESS"; completed: { stressTestId: string; status: "passed" | "failed" }[] };

export function createInitialStressTestSimulatorState(): StressTestSimulatorState {
  return { selectedTestId: null, testStatuses: {}, currentStepIndex: 0, isPlaying: false, completedTestIds: [] };
}

function finishSelectedTest(state: StressTestSimulatorState, finalStatus: "pass" | "fail"): StressTestSimulatorState {
  const testId = state.selectedTestId;
  if (!testId) return state;
  const completedTestIds = state.completedTestIds.includes(testId)
    ? state.completedTestIds
    : [...state.completedTestIds, testId];
  return {
    ...state,
    isPlaying: false,
    testStatuses: { ...state.testStatuses, [testId]: finalStatus === "pass" ? "passed" : "failed" },
    completedTestIds,
  };
}

export function stressTestSimulatorReducer(
  state: StressTestSimulatorState,
  action: StressTestSimulatorAction,
): StressTestSimulatorState {
  switch (action.type) {
    case "SELECT_TEST":
      return { ...state, selectedTestId: action.testId, currentStepIndex: 0, isPlaying: false };

    case "START_TEST":
      if (!state.selectedTestId) return state;
      return {
        ...state,
        currentStepIndex: 0,
        isPlaying: true,
        testStatuses: { ...state.testStatuses, [state.selectedTestId]: "running" },
      };

    case "ADVANCE_STEP": {
      if (!state.selectedTestId || !state.isPlaying) return state;
      const nextIndex = state.currentStepIndex + 1;
      if (nextIndex >= action.stepCount) return finishSelectedTest(state, action.finalStatus);
      return { ...state, currentStepIndex: nextIndex };
    }

    case "PAUSE":
      return state.isPlaying ? { ...state, isPlaying: false } : state;

    case "RESUME":
      if (!state.selectedTestId || state.isPlaying) return state;
      return { ...state, isPlaying: true };

    case "RESTART_TEST":
      if (!state.selectedTestId) return state;
      return {
        ...state,
        currentStepIndex: 0,
        isPlaying: false,
        testStatuses: { ...state.testStatuses, [state.selectedTestId]: "not_started" },
      };

    case "FINISH_TEST":
      return finishSelectedTest(state, action.finalStatus);

    case "HYDRATE_PROGRESS": {
      const testStatuses = { ...state.testStatuses };
      const completedTestIds = [...state.completedTestIds];
      for (const { stressTestId, status } of action.completed) {
        testStatuses[stressTestId] = status;
        if (!completedTestIds.includes(stressTestId)) completedTestIds.push(stressTestId);
      }
      return { ...state, testStatuses, completedTestIds };
    }

    default:
      return state;
  }
}
