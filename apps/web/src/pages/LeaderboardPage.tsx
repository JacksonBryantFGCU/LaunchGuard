import { useEffect, useState } from "react";
import type { LeaderboardEntryRow, PracticeScenario } from "@purgatory/shared";
import { getOverallLeaderboard, getScenarioLeaderboard, getLeaderboardProfile, updateLeaderboardProfile } from "../features/leaderboard/api.js";
import { listPracticeScenarios } from "../features/practice-scenarios/api.js";
import { ApiError } from "../lib/api/client.js";

type Tab = "overall" | "scenario";

type BoardState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; rows: LeaderboardEntryRow[] };

type ProfileState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; optedIn: boolean; displayName: string };

export function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>("overall");
  const [scenarios, setScenarios] = useState<PracticeScenario[]>([]);
  const [scenarioId, setScenarioId] = useState<string>("");
  const [profile, setProfile] = useState<ProfileState>({ status: "loading" });
  const [board, setBoard] = useState<BoardState>({ status: "loading" });
  const [nameInput, setNameInput] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    listPracticeScenarios()
      .then((list) => {
        setScenarios(list);
        setScenarioId((current) => current || list[0]?.id || "");
      })
      .catch(() => setScenarios([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    getLeaderboardProfile()
      .then((p) => {
        if (cancelled) return;
        setProfile({ status: "success", optedIn: p.optedIn, displayName: p.displayName });
        setNameInput(p.displayName);
      })
      .catch((err: unknown) => {
        if (!cancelled) setProfile({ status: "error", message: err instanceof ApiError ? err.message : "Something went wrong." });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (profile.status !== "success" || !profile.optedIn) return;
    if (tab === "scenario" && !scenarioId) return;

    let cancelled = false;
    const request = tab === "overall" ? getOverallLeaderboard() : getScenarioLeaderboard(scenarioId);
    queueMicrotask(() => {
      if (!cancelled) setBoard({ status: "loading" });
    });
    request
      .then((rows) => {
        if (!cancelled) setBoard({ status: "success", rows });
      })
      .catch((err: unknown) => {
        if (!cancelled) setBoard({ status: "error", message: err instanceof ApiError ? err.message : "Something went wrong." });
      });
    return () => {
      cancelled = true;
    };
  }, [tab, scenarioId, profile]);

  async function handleJoin() {
    setJoinError(null);
    setJoining(true);
    try {
      const updated = await updateLeaderboardProfile({ displayName: nameInput });
      setProfile({ status: "success", optedIn: updated.optedIn, displayName: updated.displayName });
    } catch (err) {
      setJoinError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setJoining(false);
    }
  }

  async function handleLeave() {
    try {
      const updated = await updateLeaderboardProfile({ optedIn: false });
      setProfile({ status: "success", optedIn: updated.optedIn, displayName: updated.displayName });
    } catch {
      // Leaving is best-effort from the UI's perspective; the profile view stays as-is on failure.
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-xl font-semibold text-slate-100">Leaderboard</h1>
      <p className="mt-1 text-sm text-slate-400">See how your architecture review scores compare - opt-in only.</p>

      {profile.status === "loading" && (
        <div className="mt-8 h-24 animate-pulse rounded-lg border border-slate-800 bg-slate-900" aria-busy="true" aria-live="polite" />
      )}

      {profile.status === "error" && (
        <div role="alert" className="mt-8 rounded-lg border border-red-900 bg-red-950/40 p-6 text-sm text-red-300">
          Couldn't load your leaderboard profile: {profile.message}
        </div>
      )}

      {profile.status === "success" && !profile.optedIn && (
        <div className="mt-8 rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-sm font-medium text-slate-100">Join the leaderboard</h2>
          <p className="mt-1 text-xs text-slate-400">
            Choose a display name to publish your practice scores inside Purgatory. Your email is never shown, and you can leave at any
            time.
          </p>
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={40}
              placeholder="Display name"
              className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-600 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleJoin}
              disabled={joining || nameInput.trim().length === 0}
              className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            >
              Join Leaderboard
            </button>
          </div>
          {joinError && <p className="mt-2 text-xs text-red-400">{joinError}</p>}
        </div>
      )}

      {profile.status === "success" && profile.optedIn && (
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTab("overall")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  tab === "overall" ? "bg-sky-600 text-white" : "bg-slate-900 text-slate-400 hover:text-slate-100"
                }`}
              >
                Overall
              </button>
              <button
                type="button"
                onClick={() => setTab("scenario")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  tab === "scenario" ? "bg-sky-600 text-white" : "bg-slate-900 text-slate-400 hover:text-slate-100"
                }`}
              >
                Scenario
              </button>
              {tab === "scenario" && (
                <select
                  value={scenarioId}
                  onChange={(e) => setScenarioId(e.target.value)}
                  className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 focus:border-sky-600 focus:outline-none"
                >
                  {scenarios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <button type="button" onClick={handleLeave} className="text-xs text-slate-500 underline underline-offset-4 hover:text-slate-300">
              Leave leaderboard
            </button>
          </div>

          <div className="mt-4">
            {board.status === "loading" && (
              <div className="h-24 animate-pulse rounded-lg border border-slate-800 bg-slate-900" aria-busy="true" aria-live="polite" />
            )}

            {board.status === "error" && (
              <div role="alert" className="rounded-lg border border-red-900 bg-red-950/40 p-6 text-sm text-red-300">
                Couldn't load the leaderboard: {board.message}
              </div>
            )}

            {board.status === "success" && board.rows.length === 0 && (
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
                No entries yet - complete a practice scenario to appear here.
              </div>
            )}

            {board.status === "success" && board.rows.length > 0 && (
              <table className="w-full overflow-hidden rounded-lg border border-slate-800 bg-slate-900 text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2">Rank</th>
                    <th className="px-4 py-2">Engineer</th>
                    <th className="px-4 py-2">Score</th>
                    {tab === "overall" && <th className="px-4 py-2">Scenarios</th>}
                  </tr>
                </thead>
                <tbody>
                  {board.rows.map((row) => (
                    <tr
                      key={`${row.rank}-${row.displayName}`}
                      className={row.isCurrentUser ? "border-sky-800 bg-slate-800" : "border-slate-800"}
                    >
                      <td className={`border-t px-4 py-2 ${row.rank <= 3 ? "font-semibold text-slate-100" : "text-slate-300"}`}>
                        {row.rank}
                      </td>
                      <td className="border-t border-slate-800 px-4 py-2 text-slate-200">{row.displayName}</td>
                      <td className="border-t border-slate-800 px-4 py-2 text-slate-200">{row.score}</td>
                      {tab === "overall" && (
                        <td className="border-t border-slate-800 px-4 py-2 text-slate-400">{row.scenariosCompleted ?? "-"}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
