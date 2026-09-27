import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AttemptLockedError,
  type NewPracticeScenarioEvidenceInput,
  type NewStressSimulationRunInput,
  type PracticeScenarioAttemptRecord,
  type PracticeScenarioEvidenceRecord,
  type PracticeScenarioRepository,
  type PracticeScenarioResponseDraftPatch,
  type PracticeScenarioResponseRecord,
  type PracticeScenarioResultInput,
  type PracticeScenarioResultRecord,
  type StressSimulationRunRecord,
} from "../services/practiceScenarioRepository.js";
import {
  toAttemptRecord,
  toEvidenceRecord,
  toResponseRecord,
  toResultRecord,
  toStressSimulationRunRecord,
  responseDraftPatchToRow,
  evidenceInputToRow,
  stressSimulationRunInputToRow,
  type AttemptRow,
  type EvidenceRow,
  type ResponseRow,
  type ResultRow,
  type StressSimulationRunRow,
} from "./practiceScenarioMappers.js";

// Never leak a raw Supabase/Postgres error to callers - same pattern as
// SupabaseReviewRepository's RepositoryError.
class RepositoryError extends Error {
  constructor(operation: string, cause: unknown) {
    super(`Practice scenario repository operation failed: ${operation}`);
    this.name = "RepositoryError";
    this.cause = cause;
  }
}

const emptyResponseRow = (): ResponseRow => ({
  diagnosis: "",
  investigation_plan: "",
  immediate_action: "",
  architecture_decision: "",
  tradeoff: "",
  severity: null,
  confidence: null,
  submitted_at: null,
});

export class SupabasePracticeScenarioRepository implements PracticeScenarioRepository {
  constructor(private readonly client: SupabaseClient) {}

  private async requireInvestigating(attemptId: string): Promise<void> {
    const { data, error } = await this.client
      .from("practice_scenario_attempts")
      .select("status")
      .eq("id", attemptId)
      .maybeSingle();
    if (error) throw new RepositoryError("requireInvestigating", error);
    if (!data) throw new Error(`Practice scenario attempt ${attemptId} does not exist.`);
    if ((data as { status: string }).status !== "investigating") {
      throw new AttemptLockedError(attemptId, "has already been submitted and can no longer be modified");
    }
  }

  async createPracticeScenarioAttempt(reviewSessionId: string, practiceScenarioId: string): Promise<PracticeScenarioAttemptRecord> {
    const existing = await this.getPracticeScenarioAttempt(reviewSessionId, practiceScenarioId);
    if (existing) return existing;

    const { data, error } = await this.client
      .from("practice_scenario_attempts")
      .insert({ review_session_id: reviewSessionId, practice_scenario_id: practiceScenarioId })
      .select()
      .maybeSingle();

    if (error) {
      // 23505 = unique_violation: another request created this attempt
      // between our lookup and our insert - resolve to the same get-or-create.
      if ((error as { code?: string }).code === "23505") {
        const raced = await this.getPracticeScenarioAttempt(reviewSessionId, practiceScenarioId);
        if (raced) return raced;
      }
      throw new RepositoryError("createPracticeScenarioAttempt", error);
    }
    if (!data) throw new RepositoryError("createPracticeScenarioAttempt", "no row returned");

    const { error: responseError } = await this.client
      .from("practice_scenario_responses")
      .insert({ attempt_id: (data as AttemptRow).id });
    if (responseError) throw new RepositoryError("createPracticeScenarioAttempt:responseRow", responseError);

    return toAttemptRecord(data as AttemptRow);
  }

  async getPracticeScenarioAttempt(reviewSessionId: string, practiceScenarioId: string): Promise<PracticeScenarioAttemptRecord | undefined> {
    const { data, error } = await this.client
      .from("practice_scenario_attempts")
      .select()
      .eq("review_session_id", reviewSessionId)
      .eq("practice_scenario_id", practiceScenarioId)
      .maybeSingle();
    if (error) throw new RepositoryError("getPracticeScenarioAttempt", error);
    return data ? toAttemptRecord(data as AttemptRow) : undefined;
  }

  async getPracticeScenarioAttemptById(attemptId: string): Promise<PracticeScenarioAttemptRecord | undefined> {
    const { data, error } = await this.client.from("practice_scenario_attempts").select().eq("id", attemptId).maybeSingle();
    if (error) throw new RepositoryError("getPracticeScenarioAttemptById", error);
    return data ? toAttemptRecord(data as AttemptRow) : undefined;
  }

  async listPracticeScenarioAttempts(reviewSessionId: string): Promise<PracticeScenarioAttemptRecord[]> {
    const { data, error } = await this.client
      .from("practice_scenario_attempts")
      .select()
      .eq("review_session_id", reviewSessionId);
    if (error) throw new RepositoryError("listPracticeScenarioAttempts", error);
    return (data as AttemptRow[]).map(toAttemptRecord);
  }

  async savePracticeScenarioResponseDraft(attemptId: string, patch: PracticeScenarioResponseDraftPatch): Promise<void> {
    await this.requireInvestigating(attemptId);
    const row = { ...responseDraftPatchToRow(patch), updated_at: new Date().toISOString() };
    const { error } = await this.client.from("practice_scenario_responses").update(row).eq("attempt_id", attemptId);
    if (error) throw new RepositoryError("savePracticeScenarioResponseDraft", error);
  }

  async getPracticeScenarioResponse(attemptId: string): Promise<PracticeScenarioResponseRecord> {
    const { data, error } = await this.client
      .from("practice_scenario_responses")
      .select()
      .eq("attempt_id", attemptId)
      .maybeSingle();
    if (error) throw new RepositoryError("getPracticeScenarioResponse", error);
    return toResponseRecord((data as ResponseRow | null) ?? emptyResponseRow());
  }

  async setPracticeScenarioRequirements(attemptId: string, requirementIds: string[]): Promise<void> {
    await this.requireInvestigating(attemptId);
    const { error: deleteError } = await this.client
      .from("practice_scenario_response_requirements")
      .delete()
      .eq("attempt_id", attemptId);
    if (deleteError) throw new RepositoryError("setPracticeScenarioRequirements:delete", deleteError);

    const uniqueIds = [...new Set(requirementIds)];
    if (uniqueIds.length === 0) return;
    const { error: insertError } = await this.client
      .from("practice_scenario_response_requirements")
      .insert(uniqueIds.map((requirementId) => ({ attempt_id: attemptId, requirement_id: requirementId })));
    if (insertError) throw new RepositoryError("setPracticeScenarioRequirements:insert", insertError);
  }

  async getPracticeScenarioRequirements(attemptId: string): Promise<string[]> {
    const { data, error } = await this.client
      .from("practice_scenario_response_requirements")
      .select("requirement_id")
      .eq("attempt_id", attemptId);
    if (error) throw new RepositoryError("getPracticeScenarioRequirements", error);
    return (data as { requirement_id: string }[]).map((row) => row.requirement_id);
  }

  async addPracticeScenarioEvidence(
    attemptId: string,
    input: NewPracticeScenarioEvidenceInput,
  ): Promise<PracticeScenarioEvidenceRecord> {
    await this.requireInvestigating(attemptId);
    const { data, error } = await this.client
      .from("practice_scenario_evidence")
      .insert(evidenceInputToRow(attemptId, input))
      .select()
      .maybeSingle();
    if (error || !data) throw new RepositoryError("addPracticeScenarioEvidence", error);
    return toEvidenceRecord(data as EvidenceRow);
  }

  async removePracticeScenarioEvidence(attemptId: string, evidenceId: string): Promise<void> {
    await this.requireInvestigating(attemptId);
    const { error } = await this.client
      .from("practice_scenario_evidence")
      .delete()
      .eq("id", evidenceId)
      .eq("attempt_id", attemptId);
    if (error) throw new RepositoryError("removePracticeScenarioEvidence", error);
  }

  async listPracticeScenarioEvidence(attemptId: string): Promise<PracticeScenarioEvidenceRecord[]> {
    const { data, error } = await this.client.from("practice_scenario_evidence").select().eq("attempt_id", attemptId);
    if (error) throw new RepositoryError("listPracticeScenarioEvidence", error);
    return (data as EvidenceRow[]).map(toEvidenceRecord);
  }

  async setResponseEvidence(attemptId: string, evidenceIds: string[]): Promise<void> {
    await this.requireInvestigating(attemptId);
    const uniqueIds = [...new Set(evidenceIds)];

    if (uniqueIds.length > 0) {
      const { data, error } = await this.client
        .from("practice_scenario_evidence")
        .select("id")
        .eq("attempt_id", attemptId)
        .in("id", uniqueIds);
      if (error) throw new RepositoryError("setResponseEvidence:validate", error);
      const validIds = new Set((data as { id: string }[]).map((row) => row.id));
      for (const id of uniqueIds) {
        if (!validIds.has(id)) throw new Error(`Evidence ${id} does not belong to practice scenario attempt ${attemptId}.`);
      }
    }

    const { error: deleteError } = await this.client
      .from("practice_scenario_response_evidence")
      .delete()
      .eq("attempt_id", attemptId);
    if (deleteError) throw new RepositoryError("setResponseEvidence:delete", deleteError);

    if (uniqueIds.length === 0) return;
    const { error: insertError } = await this.client
      .from("practice_scenario_response_evidence")
      .insert(uniqueIds.map((evidenceId) => ({ attempt_id: attemptId, evidence_id: evidenceId })));
    if (insertError) throw new RepositoryError("setResponseEvidence:insert", insertError);
  }

  async getResponseEvidenceIds(attemptId: string): Promise<string[]> {
    const { data, error } = await this.client
      .from("practice_scenario_response_evidence")
      .select("evidence_id")
      .eq("attempt_id", attemptId);
    if (error) throw new RepositoryError("getResponseEvidenceIds", error);
    return (data as { evidence_id: string }[]).map((row) => row.evidence_id);
  }

  async submitPracticeScenarioResponse(attemptId: string): Promise<PracticeScenarioAttemptRecord> {
    const submittedAt = new Date().toISOString();
    const { data, error } = await this.client
      .from("practice_scenario_attempts")
      .update({ status: "submitted", submitted_at: submittedAt, updated_at: submittedAt })
      .eq("id", attemptId)
      .eq("status", "investigating")
      .select()
      .maybeSingle();
    if (error) throw new RepositoryError("submitPracticeScenarioResponse", error);
    if (!data) throw new AttemptLockedError(attemptId, "has already been submitted and can no longer be modified");

    const { error: responseError } = await this.client
      .from("practice_scenario_responses")
      .update({ submitted_at: submittedAt, updated_at: submittedAt })
      .eq("attempt_id", attemptId);
    if (responseError) throw new RepositoryError("submitPracticeScenarioResponse:response", responseError);

    return toAttemptRecord(data as AttemptRow);
  }

  async savePracticeScenarioResult(attemptId: string, input: PracticeScenarioResultInput): Promise<void> {
    const { error } = await this.client.from("practice_scenario_results").upsert(
      {
        attempt_id: attemptId,
        objective_score: input.objectiveScore,
        objective_max_score: input.objectiveMaxScore,
        result_data: input.resultData,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "attempt_id" },
    );
    if (error) throw new RepositoryError("savePracticeScenarioResult", error);

    // Recomputing a result for an already feedback_ready+ attempt is a
    // deliberate no-op here (the conditional update simply matches zero rows).
    await this.client
      .from("practice_scenario_attempts")
      .update({ status: "feedback_ready", updated_at: new Date().toISOString() })
      .eq("id", attemptId)
      .eq("status", "submitted");
  }

  async getPracticeScenarioResult(attemptId: string): Promise<PracticeScenarioResultRecord | undefined> {
    const { data, error } = await this.client
      .from("practice_scenario_results")
      .select()
      .eq("attempt_id", attemptId)
      .maybeSingle();
    if (error) throw new RepositoryError("getPracticeScenarioResult", error);
    return data ? toResultRecord(data as ResultRow) : undefined;
  }

  async markScenarioConsequenceReady(attemptId: string): Promise<PracticeScenarioAttemptRecord> {
    const { data, error } = await this.client
      .from("practice_scenario_attempts")
      .update({ status: "consequence_ready", updated_at: new Date().toISOString() })
      .eq("id", attemptId)
      .eq("status", "feedback_ready")
      .select()
      .maybeSingle();
    if (error) throw new RepositoryError("markScenarioConsequenceReady", error);
    if (!data) throw new AttemptLockedError(attemptId, "cannot move to consequence_ready from its current status");
    return toAttemptRecord(data as AttemptRow);
  }

  async completePracticeScenario(attemptId: string): Promise<PracticeScenarioAttemptRecord> {
    const completedAt = new Date().toISOString();
    const { data, error } = await this.client
      .from("practice_scenario_attempts")
      .update({ status: "completed", completed_at: completedAt, updated_at: completedAt })
      .eq("id", attemptId)
      .eq("status", "consequence_ready")
      .select()
      .maybeSingle();
    if (error) throw new RepositoryError("completePracticeScenario", error);
    if (!data) throw new AttemptLockedError(attemptId, "cannot move to completed from its current status");
    return toAttemptRecord(data as AttemptRow);
  }

  async saveStressSimulationRun(attemptId: string, input: NewStressSimulationRunInput): Promise<StressSimulationRunRecord> {
    // No app-level lock on this: runs are allowed at any attempt status, and
    // the unique (attempt_id, test_id, run_number) constraint just means a
    // very rare race would fail the insert rather than silently overwrite a
    // prior run - runs are immutable by design (spec #35).
    const { count, error: countError } = await this.client
      .from("stress_simulation_runs")
      .select("id", { count: "exact", head: true })
      .eq("attempt_id", attemptId)
      .eq("test_id", input.testId);
    if (countError) throw new RepositoryError("saveStressSimulationRun:count", countError);
    const runNumber = (count ?? 0) + 1;

    const { data, error } = await this.client
      .from("stress_simulation_runs")
      .insert(stressSimulationRunInputToRow(attemptId, runNumber, input))
      .select()
      .maybeSingle();
    if (error || !data) throw new RepositoryError("saveStressSimulationRun", error);
    return toStressSimulationRunRecord(data as StressSimulationRunRow);
  }

  async listStressSimulationRuns(attemptId: string): Promise<StressSimulationRunRecord[]> {
    const { data, error } = await this.client
      .from("stress_simulation_runs")
      .select()
      .eq("attempt_id", attemptId)
      .order("created_at", { ascending: true });
    if (error) throw new RepositoryError("listStressSimulationRuns", error);
    return (data as StressSimulationRunRow[]).map(toStressSimulationRunRecord);
  }
}
