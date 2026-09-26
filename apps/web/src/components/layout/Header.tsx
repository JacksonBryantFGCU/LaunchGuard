import { Link } from "react-router-dom";

export function Header() {
  return (
    <header className="border-b border-slate-800 bg-slate-950">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-6">
        <Link to="/" className="text-sm font-semibold tracking-tight text-slate-100">
          Redline
        </Link>
        <nav aria-label="Primary" className="text-sm">
          <Link to="/" className="text-slate-400 hover:text-slate-100">
            Scenarios
          </Link>
        </nav>
      </div>
    </header>
  );
}
