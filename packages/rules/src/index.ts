import type { Rule } from "./engine.js";
import { missingEnvExample } from "./rules/missingEnvExample.js";
import { missingBuildScript } from "./rules/missingBuildScript.js";
import { missingStartScript } from "./rules/missingStartScript.js";
import { missingHealthCheck } from "./rules/missingHealthCheck.js";
import { broadCorsConfig } from "./rules/broadCorsConfig.js";

export type { Rule } from "./engine.js";
export { runRules } from "./engine.js";

export const allRules: Rule[] = [
  missingEnvExample,
  missingBuildScript,
  missingStartScript,
  missingHealthCheck,
  broadCorsConfig,
];
