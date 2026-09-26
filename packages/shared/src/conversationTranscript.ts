import { z } from "zod";

export const ConversationSpeakerSchema = z.enum(["reviewer", "architect"]);
export type ConversationSpeaker = z.infer<typeof ConversationSpeakerSchema>;

export const ArchitectConversationTurnSchema = z.object({
  id: z.string().min(1),
  speaker: ConversationSpeakerSchema,
  text: z.string().min(1).max(4000),
  timestamp: z.string().min(1),
  final: z.boolean(),
});
export type ArchitectConversationTurn = z.infer<typeof ArchitectConversationTurnSchema>;

// Normalized, provider-agnostic evidence of an architect conversation.
// Bounded well past a realistic single review session.
export const ArchitectConversationEvidenceSchema = z.object({
  conversationId: z.string().min(1),
  startedAt: z.string().min(1),
  endedAt: z.string().min(1).optional(),
  turns: z.array(ArchitectConversationTurnSchema).max(300),
});
export type ArchitectConversationEvidence = z.infer<typeof ArchitectConversationEvidenceSchema>;
