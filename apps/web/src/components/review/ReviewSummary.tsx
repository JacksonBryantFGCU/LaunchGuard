import type { PublicReviewScenario } from "@redline/shared";

interface ReviewSummaryProps {
  scenario: PublicReviewScenario;
  reviewedCount: number;
  commentCount: number;
  hasNotes: boolean;
}

export function ReviewSummary({ scenario, reviewedCount, commentCount, hasNotes }: ReviewSummaryProps) {
  const totalCount = scenario.files.length;
  const warnings: string[] = [];
  if (reviewedCount < totalCount) {
    warnings.push(`You have reviewed ${reviewedCount} of ${totalCount} changed files.`);
  }
  if (commentCount === 0) {
    warnings.push("You have not left any inline comments.");
  }

  return (
    <section aria-labelledby="review-summary-heading" className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h2 id="review-summary-heading" className="text-sm font-semibold text-slate-100">
        {scenario.title} <span className="font-normal text-slate-500">· PR #{scenario.pullRequest.number}</span>
      </h2>
      <p className="mt-1 text-sm text-slate-400">{scenario.pullRequest.title}</p>

      <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Files reviewed</dt>
          <dd className="font-medium text-slate-100">
            {reviewedCount} / {totalCount}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Inline comments</dt>
          <dd className="font-medium text-slate-100">{commentCount}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Reviewer notes</dt>
          <dd className="font-medium text-slate-100">{hasNotes ? "Added" : "None"}</dd>
        </div>
      </dl>

      {warnings.length > 0 && (
        <ul className="mt-4 space-y-1 text-xs text-amber-400">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
