import type { Rule } from "./engine.js";
import { missingEnvExample } from "./rules/missingEnvExample.js";
import { missingBuildScript } from "./rules/missingBuildScript.js";
import { missingStartScript } from "./rules/missingStartScript.js";
import { missingHealthCheck } from "./rules/missingHealthCheck.js";
import { broadCorsConfig } from "./rules/broadCorsConfig.js";
import { committedEnvFile } from "./rules/committedEnvFile.js";
import { missingGitignore } from "./rules/missingGitignore.js";
import { conflictingLockfiles } from "./rules/conflictingLockfiles.js";
import { missingNodeEngine } from "./rules/missingNodeEngine.js";
import { devScriptInStart } from "./rules/devScriptInStart.js";
import { missingTsconfig } from "./rules/missingTsconfig.js";
import { potentialSecretCommitted } from "./rules/potentialSecretCommitted.js";

export type { Rule } from "./engine.js";
export { runRules } from "./engine.js";

export const allRules: Rule[] = [
  missingEnvExample,
  missingBuildScript,
  missingStartScript,
  missingHealthCheck,
  broadCorsConfig,
  committedEnvFile,
  missingGitignore,
  conflictingLockfiles,
  missingNodeEngine,
  devScriptInStart,
  missingTsconfig,
  potentialSecretCommitted,
];
