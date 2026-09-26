import { VoiceSessionRequestSchema, type VoiceSessionResponse } from "@redline/shared";
import { getInternalScenarioBySlug } from "@redline/scenarios";
import { env } from "../config/env.js";
import { buildDeveloperContext } from "./developerContextService.js";
import { createSignedConversationUrl, ElevenLabsProviderError } from "./elevenLabsService.js";

export type VoiceErrorCode = "INVALID_SCENARIO" | "VOICE_CONFIGURATION_MISSING" | "VOICE_PROVIDER_UNAVAILABLE";

export class VoiceError extends Error {
  constructor(
    public readonly code: VoiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "VoiceError";
  }
}

// route -> voiceService -> (scenario service + developer context builder) -> elevenLabsService
export async function createVoiceSession(input: unknown): Promise<VoiceSessionResponse> {
  const { scenarioSlug } = VoiceSessionRequestSchema.parse(input);

  const scenario = getInternalScenarioBySlug(scenarioSlug);
  if (!scenario) {
    throw new VoiceError("INVALID_SCENARIO", `Unknown scenario: ${scenarioSlug}`);
  }

  if (!env.ELEVENLABS_API_KEY || !env.ELEVENLABS_AGENT_ID) {
    throw new VoiceError("VOICE_CONFIGURATION_MISSING", "Voice conversations are not configured on this server.");
  }

  const dynamicVariables = buildDeveloperContext(scenario);

  let signedUrl: string;
  try {
    ({ signedUrl } = await createSignedConversationUrl({
      apiKey: env.ELEVENLABS_API_KEY,
      agentId: env.ELEVENLABS_AGENT_ID,
    }));
  } catch (error) {
    if (error instanceof ElevenLabsProviderError) {
      throw new VoiceError("VOICE_PROVIDER_UNAVAILABLE", "Could not start a voice session right now.");
    }
    throw error;
  }

  return {
    signedUrl,
    dynamicVariables,
    developer: { name: scenario.developerPersona.name, role: scenario.developerPersona.role },
  };
}
