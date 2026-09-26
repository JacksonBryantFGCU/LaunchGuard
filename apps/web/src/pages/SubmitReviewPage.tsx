import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { FINAL_EXPLANATION_MIN_LENGTH, type ReviewSubmission } from "@redline/shared";
import { useReviewSessionContext } from "../features/review/reviewSessionContextInternal.js";
import { submitReview } from "../features/review/api.js";
import { ApiError } from "../lib/api/client.js";
import { ReviewSummary } from "../components/review/ReviewSummary.js";
import { ReviewDecisionSelector } from "../components/review/ReviewDecisionSelector.js";
import { FinalReviewExplanation } from "../components/review/FinalReviewExplanation.js";
import { SubmissionConfirmation } from "../components/review/SubmissionConfirmation.js";

export function SubmitReviewPage() {
  const { scenario, state, setDecision, setFinalExplanation, submitStart, submitSuccess, submitError, endCall } =
    useReviewSessionContext();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);

  if (state.submissionStatus === "submitted") {
    return <Navigate to={`/review/${scenario.slug}/submitted`} replace />;
  }

  const explanationValid = state.finalExplanation.trim().length >= FINAL_EXPLANATION_MIN_LENGTH;
  const canContinue = state.decision !== null && explanationValid;

  async function handleConfirmSubmit() {
    if (!state.decision) return;

    // An active developer call must not outlive submission: end it and let
    // its last transcript entries settle before building the payload.
    if (state.voiceStatus === "connected" || state.voiceStatus === "connecting") {
      await endCall();
    }

    submitStart();
    const payload: ReviewSubmission = {
      scenarioSlug: scenario.slug,
      reviewedFiles: Array.from(state.reviewedFiles),
      comments: state.comments.map(({ id, file, startLine, endLine, body }) => ({ id, file, startLine, endLine, body })),
      reviewerNotes: state.reviewerNotes,
      decision: state.decision,
      finalExplanation: state.finalExplanation,
      transcript: state.transcript.filter((entry) => entry.final),
    };

    try {
      const result = await submitReview(payload);
      submitSuccess(result.reviewId, result.submittedAt);
      navigate(`/review/${scenario.slug}/submitted`);
    } catch (err) {
      submitError(err instanceof ApiError ? err.message : "Something went wrong submitting your review.");
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <Link to={`/review/${scenario.slug}`} className="text-xs text-slate-400 hover:text-slate-200">
        &larr; Back to review
      </Link>

      <h1 className="mt-3 text-lg font-semibold text-slate-100">Submit Review</h1>

      <div className="mt-4 flex flex-col gap-4">
        <ReviewSummary
          scenario={scenario}
          reviewedCount={state.reviewedFiles.size}
          commentCount={state.comments.length}
          hasNotes={state.reviewerNotes.trim().length > 0}
        />

        {!confirming && (
          <>
            <ReviewDecisionSelector value={state.decision} onChange={setDecision} />
            <FinalReviewExplanation value={state.finalExplanation} onChange={setFinalExplanation} />

            <div className="flex justify-end">
              <button
                type="button"
                disabled={!canContinue}
                onClick={() => setConfirming(true)}
                className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </>
        )}

        {confirming && state.decision && (
          <SubmissionConfirmation
            decision={state.decision}
            commentCount={state.comments.length}
            reviewedCount={state.reviewedFiles.size}
            totalCount={scenario.files.length}
            submitting={state.submissionStatus === "submitting"}
            errorMessage={state.submissionStatus === "error" ? state.submissionError : undefined}
            onBack={() => setConfirming(false)}
            onConfirm={handleConfirmSubmit}
          />
        )}
      </div>
    </main>
  );
}
