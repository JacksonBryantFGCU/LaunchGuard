import { useState, type FormEvent } from "react";
import { isLikelyGitHubUrl } from "../validation";

interface RepositoryScanFormProps {
  onSubmit: (repositoryUrl: string) => void;
  disabled: boolean;
}

export function RepositoryScanForm({ onSubmit, disabled }: RepositoryScanFormProps) {
  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);

  const trimmed = value.trim();
  const showValidationHint = touched && trimmed.length > 0 && !isLikelyGitHubUrl(trimmed);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-start">
      <div className="flex-1">
        <label htmlFor="repository-url" className="mb-1 block text-sm font-medium text-slate-700">
          GitHub repository URL
        </label>
        <input
          id="repository-url"
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="https://github.com/owner/repository"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => setTouched(true)}
          disabled={disabled}
          aria-invalid={showValidationHint}
          aria-describedby={showValidationHint ? "repository-url-hint" : undefined}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100"
        />
        {showValidationHint && (
          <p id="repository-url-hint" className="mt-1 text-sm text-amber-700">
            That doesn't look like a public GitHub repository URL (e.g. https://github.com/owner/repository).
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={disabled || !trimmed}
        className="mt-1 shrink-0 rounded-md bg-slate-900 px-4 py-2 font-medium text-white transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-60 sm:mt-6"
      >
        {disabled ? "Scanning…" : "Analyze repository"}
      </button>
    </form>
  );
}
