import { Link } from "react-router-dom";

const HOW_IT_WORKS = [
  { title: "Review", body: "Understand requirements and inspect the architecture." },
  { title: "Investigate", body: "Question the AI architect and collect technical evidence." },
  { title: "Decide", body: "Submit architecture findings and recommendations." },
  { title: "Stress Test", body: "Watch the system react to realistic failure conditions." },
  { title: "Improve", body: "Get structured feedback and build architecture judgment." },
];

const TRAINED_ON = ["Reliability", "Scalability", "Data Integrity", "Distributed Systems", "Resilience", "Architecture Tradeoffs"];

export function LandingPage() {
  return (
    <div className="min-h-svh bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <span className="text-sm font-semibold tracking-tight">Redline</span>
          <nav className="flex items-center gap-6 text-sm">
            <a href="#how-it-works" className="text-slate-400 hover:text-slate-100">
              How It Works
            </a>
            <Link to="/sign-in" className="text-slate-400 hover:text-slate-100">
              Sign In
            </Link>
            <Link
              to="/sign-up"
              className="rounded-md bg-slate-100 px-3 py-1.5 font-medium text-slate-950 hover:bg-white"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl">
              Learn to review systems,
              <br />
              not just design them.
            </h1>
            <p className="mt-6 max-w-lg text-base text-slate-400">
              Practice architecture review through guided missions. Inspect real system designs, question the
              architect, identify production risks, and see how the system behaves under failure.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <Link
                to="/sign-up"
                className="rounded-md bg-slate-100 px-5 py-2.5 text-sm font-medium text-slate-950 hover:bg-white"
              >
                Start Practicing
              </Link>
              <Link to="/sign-in" className="text-sm font-medium text-slate-300 hover:text-slate-100">
                Sign In
              </Link>
            </div>
          </div>

          <div
            aria-hidden="true"
            className="rounded-lg border border-slate-800 bg-slate-900/60 p-6 font-mono text-sm shadow-2xl shadow-black/40"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgb(30 41 59 / 0.4) 1px, transparent 1px), linear-gradient(to bottom, rgb(30 41 59 / 0.4) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          >
            <p className="text-xs tracking-widest text-slate-500">MISSION 2 / 5</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-100">Payment Safety</h2>
            <p className="mt-2 text-sm text-slate-400">
              Determine whether payment processing remains safe during retries and provider degradation.
            </p>
            <div className="mt-6 flex flex-col items-center gap-2 text-xs text-slate-300">
              <div className="rounded-md border border-slate-700 bg-slate-800 px-4 py-2">Checkout Service</div>
              <div className="text-slate-600">↓</div>
              <div className="rounded-md border border-slate-700 bg-slate-800 px-4 py-2">Payment Provider</div>
            </div>
            <button
              type="button"
              disabled
              className="mt-6 w-full rounded-md border border-slate-700 py-2 text-xs font-medium text-slate-300"
            >
              Question Architect
            </button>
          </div>
        </section>

        <section id="how-it-works" className="border-t border-slate-800 bg-slate-950/60 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-sm font-semibold tracking-widest text-slate-500 uppercase">How It Works</h2>
            <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
              {HOW_IT_WORKS.map((step, i) => (
                <li key={step.title} className="rounded-lg border border-slate-800 p-4">
                  <span className="text-xs text-slate-500">{i + 1}</span>
                  <h3 className="mt-1 text-sm font-semibold text-slate-100">{step.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-slate-800 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-sm font-semibold tracking-widest text-slate-500 uppercase">What Redline Trains</h2>
            <ul className="mt-6 flex flex-wrap gap-3">
              {TRAINED_ON.map((topic) => (
                <li
                  key={topic}
                  className="rounded-full border border-slate-800 px-4 py-1.5 text-sm text-slate-300"
                >
                  {topic}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-slate-800 py-20">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <h2 className="text-2xl font-semibold text-slate-100">Ready to review your first system?</h2>
            <Link
              to="/sign-up"
              className="mt-6 inline-block rounded-md bg-slate-100 px-5 py-2.5 text-sm font-medium text-slate-950 hover:bg-white"
            >
              Start Practicing
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
