import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { SystemSummary } from "@purgatory/shared";
import { getSystems, createSystem } from "../features/systems/api.js";
import { groupSystems } from "../features/systems/grouping.js";
import { ApiError } from "../lib/api/client.js";
import { SystemCard } from "../components/systems/SystemCard.js";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; systems: SystemSummary[] };

export function SystemsHomePage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    getSystems()
      .then((systems) => {
        if (!cancelled) setState({ status: "success", systems });
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ status: "error", message: err instanceof ApiError ? err.message : "Something went wrong." });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const system = await createSystem({ name, description: description || undefined });
      navigate(`/app/systems/${system.id}`);
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Something went wrong.");
      setCreating(false);
    }
  }

  const { samples, owned } = state.status === "success" ? groupSystems(state.systems) : { samples: [], owned: [] };

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Systems</h1>
          <p className="mt-1 text-sm text-slate-400">Test how your architecture holds up under stress.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="inline-flex items-center rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-100"
        >
          + Create System
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="mt-6 flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-900 p-5">
          <label className="flex flex-col gap-1 text-sm text-slate-300">
            System Name
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-300">
            Description (optional)
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100"
            />
          </label>
          {createError && <p role="alert" className="text-sm text-red-300">{createError}</p>}
          <button
            type="submit"
            disabled={creating}
            className="inline-flex w-fit items-center rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-white disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create System"}
          </button>
        </form>
      )}

      <div className="mt-8">
        {state.status === "loading" && (
          <div className="grid gap-4 sm:grid-cols-2" aria-busy="true" aria-live="polite">
            {[0, 1].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-lg border border-slate-800 bg-slate-900" />
            ))}
          </div>
        )}

        {state.status === "error" && (
          <div role="alert" className="rounded-lg border border-red-900 bg-red-950/40 p-6 text-sm text-red-300">
            Couldn't load systems: {state.message}
          </div>
        )}

        {state.status === "success" && (
          <>
            <section>
              <h2 className="text-sm font-medium text-slate-400">Your Systems</h2>
              {owned.length === 0 ? (
                <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
                  No systems yet. Create a system to begin testing your architecture.
                </div>
              ) : (
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  {owned.map((system) => (
                    <SystemCard key={system.id} system={system} />
                  ))}
                </div>
              )}
            </section>

            <section className="mt-8">
              <h2 className="text-sm font-medium text-slate-400">Samples</h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {samples.map((system) => (
                  <SystemCard key={system.id} system={system} />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
