import { z } from "zod";

export const TRANSCRIPT_ENTRY_MAX_TEXT_LENGTH = 4000;
export const TRANSCRIPT_MAX_ENTRIES = 500;

export const TranscriptSpeakerSchema = z.enum(["reviewer", "developer"]);
export type TranscriptSpeaker = z.infer<typeof TranscriptSpeakerSchema>;

// Redline's own normalized shape for a finalized conversation turn - never a
// raw ElevenLabs SDK/event object.
export const TranscriptEntrySchema = z.object({
  id: z.string().min(1),
  speaker: TranscriptSpeakerSchema,
  text: z.string().min(1).max(TRANSCRIPT_ENTRY_MAX_TEXT_LENGTH),
  timestamp: z.string().datetime(),
  final: z.literal(true),
});
export type TranscriptEntry = z.infer<typeof TranscriptEntrySchema>;

export const VoiceSessionRequestSchema = z.object({
  scenarioSlug: z.string().min(1),
});
export type VoiceSessionRequest = z.infer<typeof VoiceSessionRequestSchema>;

// Only what the browser needs to open the ElevenLabs session - never the API
// key, never hidden scenario truth. dynamicVariables is an opaque bag of
// allow-listed developer-context strings the frontend forwards to the
// ElevenLabs SDK without reading or storing it anywhere.
export const VoiceSessionResponseSchema = z.object({
  signedUrl: z.string().min(1),
  dynamicVariables: z.record(z.string(), z.string()),
  developer: z.object({
    name: z.string(),
    role: z.string(),
  }),
});
export type VoiceSessionResponse = z.infer<typeof VoiceSessionResponseSchema>;
