import type { ProjectInfo, RepositoryInfo, RepositoryStatistics } from "@launchguard/shared";

interface RepositorySummaryProps {
  repository: RepositoryInfo;
  project: ProjectInfo;
  statistics: RepositoryStatistics;
}

export function RepositorySummary({ repository, project, statistics }: RepositorySummaryProps) {
  const badges = [...project.languages, ...project.frameworks, project.packageManager !== "unknown" ? project.packageManager : null].filter(
    (v): v is string => Boolean(v),
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-xl font-semibold text-slate-900">
        {repository.owner} / {repository.name}
      </h2>
      {badges.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {badges.map((badge) => (
            <li key={badge} className="rounded-full border border-slate-300 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
              {badge}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-sm text-slate-500">
        {statistics.filesAnalyzed} of {statistics.filesSeen} files analyzed
        {statistics.truncated ? " (scan limits reached — results may be partial)" : ""}
      </p>
    </div>
  );
}
