import { VoiceSessionResponseSchema, type VoiceSessionFocus, type VoiceSessionResponse } from "@redline/shared";
import { apiPost } from "../../lib/api/client.js";

export function createVoiceSession(scenarioSlug: string, focus?: VoiceSessionFocus): Promise<VoiceSessionResponse> {
  return apiPost("/api/voice/sessions", { scenarioSlug, focus }, (data) => VoiceSessionResponseSchema.parse(data), { authed: true });
}
