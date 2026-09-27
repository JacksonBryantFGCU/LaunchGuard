import { Link } from "react-router-dom";
import { UserButton } from "@clerk/react";

// Only rendered inside AppLayout, which is only reachable through
// ProtectedRoute - the user is always signed in here.
export function Header() {
  return (
    <header className="border-b border-slate-800 bg-slate-950">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Link to="/app" className="text-sm font-semibold tracking-tight text-slate-100">
            Purgatory
          </Link>
          <Link to="/app" className="text-sm text-slate-400 hover:text-slate-100">
            Practice
          </Link>
          <Link to="/app/history" className="text-sm text-slate-400 hover:text-slate-100">
            History
          </Link>
          <Link to="/app/leaderboard" className="text-sm text-slate-400 hover:text-slate-100">
            Leaderboard
          </Link>
        </div>
        <UserButton />
      </div>
    </header>
  );
}
