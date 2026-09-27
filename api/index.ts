import { register } from "tsx/esm/api";

// The api and packages/* workspaces ship raw .ts as their package entry
// point (see e.g. packages/scenarios/package.json) and rely on tsx to
// execute it - true for `pnpm dev`/`pnpm start` and for this Vercel
// function alike. Vercel's own TS handling only transpiles files inside
// this function's own tree, not workspace deps loaded via node_modules,
// so we register tsx's loader before importing anything that pulls them in.
register();

const { createApp } = await import("../apps/api/src/app.js");

export default createApp();
