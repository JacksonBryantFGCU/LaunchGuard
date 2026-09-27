import { z } from "zod";

// Contextual Stress Lab focus, sent only when the learner launched the
// conversation from a selected node/edge/bottleneck/requirement (spec #14).
// Every field is plain text the frontend already shows the learner - the
// selected component's label, a bottleneck's observed metric/threshold, a
// requirement's own status text, an observed metric snapshot. Never
// expected answers, hidden interventions, or rubric data - the frontend has
// no access to those fields to begin with.
export const VoiceSessionFocusSchema = z.object({
  focusLabel: z.string().min(1).optional(),
  bottleneckSummary: z.string().min(1).optional(),
  requirementSummary: z.string().min(1).optional(),
  metricsSummary: z.string().min(1).optional(),
});
export type VoiceSessionFocus = z.infer<typeof VoiceSessionFocusSchema>;

export const VoiceSessionRequestSchema = z.object({
  scenarioSlug: z.string().min(1),
  focus: VoiceSessionFocusSchema.optional(),
});
export type VoiceSessionRequest = z.infer<typeof VoiceSessionRequestSchema>;

// Everything the browser needs to start a websocket conversation, and
// nothing else - no API key, no private architect rationale beyond what's
// already allow-listed into dynamicVariables, no hidden scenario truth.
// Websocket (rather than WebRTC) connects to the same api.elevenlabs.io
// host used to mint this signed URL, which passes through restrictive
// networks (school/campus/corporate firewalls) far more reliably than
// WebRTC's dedicated media relay.
export const VoiceSessionResponseSchema = z.object({
  signedUrl: z.string().min(1),
  dynamicVariables: z.record(z.string(), z.string()),
});
export type VoiceSessionResponse = z.infer<typeof VoiceSessionResponseSchema>;
