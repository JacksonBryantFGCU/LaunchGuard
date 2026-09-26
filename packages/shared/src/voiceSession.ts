import { z } from "zod";

export const VoiceSessionRequestSchema = z.object({
  scenarioSlug: z.string().min(1),
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
