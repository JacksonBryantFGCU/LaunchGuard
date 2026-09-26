import { VoiceSessionResponseSchema } from "@redline/shared";
import { apiPost } from "../../lib/api/client.js";

export function requestVoiceSession(scenarioSlug: string) {
  return apiPost("/api/voice/sessions", { scenarioSlug }, (data) => VoiceSessionResponseSchema.parse(data));
}
