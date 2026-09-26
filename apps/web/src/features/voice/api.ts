import { VoiceSessionResponseSchema, type VoiceSessionResponse } from "@redline/shared";
import { apiPost } from "../../lib/api/client.js";

export function createVoiceSession(scenarioSlug: string): Promise<VoiceSessionResponse> {
  return apiPost("/api/voice/sessions", { scenarioSlug }, (data) => VoiceSessionResponseSchema.parse(data), { authed: true });
}
