import { createContext, useContext } from "react";
import type { PracticeScenarioAttemptView, PracticeResponseDraft, ScenarioEvaluationResult, AddPracticeEvidenceRequest } from "@redline/shared";
import type { AutosaveStatus } from "./practiceWorkflow.js";

export interface PracticeAttemptContextValue {
  view: PracticeScenarioAttemptView;
  autosaveStatus: AutosaveStatus;
  updateDraft: (patch: Partial<PracticeResponseDraft>) => void;
  setRequirements: (requirementIds: string[]) => Promise<void>;
  addEvidence: (input: AddPracticeEvidenceRequest) => Promise<void>;
  removeEvidence: (evidenceId: string) => Promise<void>;
  setSelectedEvidence: (evidenceIds: string[]) => Promise<void>;
  submit: () => Promise<ScenarioEvaluationResult>;
  markConsequenceReady: () => Promise<void>;
  complete: () => Promise<void>;
}

export const PracticeAttemptReactContext = createContext<PracticeAttemptContextValue | null>(null);

export function usePracticeAttempt(): PracticeAttemptContextValue {
  const ctx = useContext(PracticeAttemptReactContext);
  if (!ctx) throw new Error("usePracticeAttempt must be used within a PracticeAttemptProvider");
  return ctx;
}
