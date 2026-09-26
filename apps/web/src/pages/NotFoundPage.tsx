import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col items-start gap-3 px-6 py-16">
      <h1 className="text-xl font-semibold text-slate-100">Page not found</h1>
      <p className="text-sm text-slate-400">The page you're looking for doesn't exist.</p>
      <Link to="/" className="text-sm font-medium text-slate-100 underline underline-offset-4">
        Back home
      </Link>
    </main>
  );
}
