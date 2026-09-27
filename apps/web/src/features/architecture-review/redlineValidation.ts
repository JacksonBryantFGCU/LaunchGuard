import { RedlineSchema, type RedlineTargetType } from "@purgatory/shared";
import type { RedlineDraft } from "./reviewState.js";

export interface RedlineFormInput {
  targetType: RedlineTargetType;
  targetId: string;
  category: string;
  severity: string;
  title: string;
  reasoning: string;
}

export type RedlineValidationResult = { ok: true; draft: RedlineDraft } | { ok: false; errors: Record<string, string> };

/** Validates reviewer-entered redline fields. Never checks against hidden scenario truth. */
export function validateRedlineDraft(input: RedlineFormInput): RedlineValidationResult {
  const result = RedlineSchema.omit({ id: true, createdAt: true }).safeParse({
    targetType: input.targetType,
    targetId: input.targetId,
    category: input.category,
    severity: input.severity,
    title: input.title.trim(),
    reasoning: input.reasoning.trim(),
  });

  if (result.success) {
    return { ok: true, draft: result.data };
  }

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !(field in errors)) {
      errors[field] = issue.message;
    }
  }
  return { ok: false, errors };
}
