import { build } from "esbuild";

// @redline/scenarios and @redline/shared ship raw .ts as their package.json
// "main" with no build step, which only works when something (tsx, Vite)
// transforms TS-in-node_modules on the fly - Vercel's Node runtime doesn't.
// The bundled output also lives at api/index.js (repo root), one level up
// from apps/api/node_modules, so real npm deps left external wouldn't
// resolve there either. Bundling everything sidesteps both problems: the
// function ships as one self-contained file with no runtime node_modules
// dependency at all.
await build({
  entryPoints: ["apps/api/src/vercelHandler.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
  outfile: "api/index.js",
});
