import { useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import type { ArchitectureRecommendation } from "@purgatory/shared";
import { useReviewState } from "../features/architecture-review/reviewStateStore.js";
import { validateSubmission } from "../features/architecture-review/submissionValidation.js";
import { submitReviewSession } from "../features/review-session/api.js";
import { ApiError } from "../lib/api/client.js";
import type { ReviewOutletContext } from "./ArchitectureReviewLayout.js";
import { ReviewCoverageSummary } from "../components/review/ReviewCoverageSummary.js";
import { ArchitectureRecommendationSelector } from "../components/review/ArchitectureRecommendationSelector.js";
import { FinalReviewRationale } from "../components/review/FinalReviewRationale.js";
import { SubmissionConfirmation } from "../components/review/SubmissionConfirmation.js";

export function ReviewSummaryPage() {
  const { scenario } = useOutletContext<ReviewOutletContext>();
  const { state, dispatch } = useReviewState();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (state.submissionStatus === "submitted") {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-sm text-slate-300">
          This review has already been submitted.{" "}
          <Link to={`/app/review/${scenario.slug}/submitted`} className="underline underline-offset-4">
            View submitted review
          </Link>
        </p>
      </main>
    );
  }

  const warnings: string[] = [];
  if (state.reviewedNodeIds.length < scenario.nodes.length) warnings.push("You have not reviewed all architecture components.");
  if (state.reviewedEdgeIds.length < scenario.edges.length) warnings.push("You have not reviewed all architecture connections.");
  if (state.redlines.length === 0) warnings.push("You have not added any architecture redlines.");
  if (state.reviewerNotes.trim().length === 0) warnings.push("Reviewer notes are empty.");

  function handleContinue() {
    const result = validateSubmission(state);
    if (!result.ok) {
      setFieldErrors(result.errors);
      return;
    }
    setFieldErrors({});
    setConfirming(true);
  }

  async function handleSubmit() {
    const result = validateSubmission(state);
    if (!result.ok) {
      setFieldErrors(result.errors);
      setConfirming(false);
      return;
    }
    if (state.submissionStatus === "submitting") return;
    if (!state.reviewSessionId) return;
    dispatch({ type: "SUBMIT_START" });
    try {
      const session = await submitReviewSession(state.reviewSessionId, result.submission);
      dispatch({ type: "HYDRATE_FROM_SESSION", session });
      navigate(`/app/review/${scenario.slug}/submitted`);
    } catch (err) {
      dispatch({ type: "SUBMIT_ERROR", message: err instanceof ApiError ? err.message : "Something went wrong." });
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-xl font-semibold text-slate-100">Architecture Review Summary</h1>
      <p className="mt-1 text-sm text-slate-400">
        {scenario.title} · {scenario.reviewCode}
      </p>

      <div className="mt-6 flex flex-col gap-6">
        <ReviewCoverageSummary
          redlines={state.redlines}
          reviewedNodeCount={state.reviewedNodeIds.length}
          totalNodeCount={scenario.nodes.length}
          reviewedEdgeCount={state.reviewedEdgeIds.length}
          totalEdgeCount={scenario.edges.length}
        />

        {warnings.length > 0 && (
          <ul className="flex flex-col gap-1 rounded-md border border-amber-900 bg-amber-950/30 p-3 text-xs text-amber-300">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}

        <p className="rounded-md border border-slate-800 bg-slate-900 p-3 text-xs text-slate-400">
          Before submitting, make sure your review clearly explains: what you believe is risky, why it matters, which
          requirements are affected, and whether the architecture should proceed.
        </p>

        {confirming && state.recommendation ? (
          <SubmissionConfirmation
            recommendation={state.recommendation}
            reviewedNodeCount={state.reviewedNodeIds.length}
            totalNodeCount={scenario.nodes.length}
            reviewedEdgeCount={state.reviewedEdgeIds.length}
            totalEdgeCount={scenario.edges.length}
            redlineCount={state.redlines.length}
            submitting={state.submissionStatus === "submitting"}
            errorMessage={state.submissionStatus === "error" ? state.submissionError : null}
            onBack={() => setConfirming(false)}
            onConfirm={handleSubmit}
          />
        ) : (
          <>
            <ArchitectureRecommendationSelector
              value={state.recommendation}
              onChange={(recommendation: ArchitectureRecommendation) => dispatch({ type: "SET_RECOMMENDATION", recommendation })}
              error={fieldErrors.recommendation}
            />
            <FinalReviewRationale
              value={state.finalRationale}
              onChange={(rationale) => dispatch({ type: "SET_FINAL_RATIONALE", rationale })}
              error={fieldErrors.finalRationale}
            />

            <div className="flex justify-between">
              <Link to={`/app/review/${scenario.slug}`} className="text-sm font-medium text-slate-300 underline underline-offset-4">
                Back to Workspace
              </Link>
              <button
                type="button"
                onClick={handleContinue}
                className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
              >
                Continue
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
