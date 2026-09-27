import { VoiceSessionRequestSchema, VoiceSessionResponseSchema, type VoiceSessionResponse } from "@redline/shared";
import { getInternalScenarioBySlug } from "@redline/scenarios/internal";
import { createSignedUrl, ElevenLabsProviderError, type CreateSignedUrlInput } from "./elevenLabsService.js";
import { buildArchitectConversationContext, buildStressLabFocusVariables } from "./architectContextService.js";
import { env } from "../config/env.js";
import { logger } from "../logger.js";

export type CreateVoiceSessionFailure = { ok: false; status: number; error: string; message: string };
export type CreateVoiceSessionSuccess = { ok: true; result: VoiceSessionResponse };
export type CreateVoiceSessionResult = CreateVoiceSessionSuccess | CreateVoiceSessionFailure;

export interface VoiceSessionDeps {
  apiKey?: string;
  agentId?: string;
  requestSignedUrl: (input: CreateSignedUrlInput) => ReturnType<typeof createSignedUrl>;
}

const defaultDeps: VoiceSessionDeps = {
  apiKey: env.ELEVENLABS_API_KEY,
  agentId: env.ELEVENLABS_AGENT_ID,
  requestSignedUrl: createSignedUrl,
};

/**
 * Builds a Redline architect-conversation voice session. Validates the
 * request, confirms the scenario exists, checks internal scenario data
 * only to build the allow-listed architect context (never serializes it
 * wholesale), and requests ElevenLabs credentials through elevenLabsService.
 * Never scores, evaluates, or reveals hidden scenario truth.
 */
export async function createVoiceSession(body: unknown, deps: VoiceSessionDeps = defaultDeps): Promise<CreateVoiceSessionResult> {
  const parsed = VoiceSessionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, status: 400, error: "INVALID_REQUEST", message: "A scenario slug is required." };
  }

  const scenario = getInternalScenarioBySlug(parsed.data.scenarioSlug);
  if (!scenario) {
    return { ok: false, status: 404, error: "INVALID_SCENARIO", message: "No scenario matches this slug." };
  }

  if (!deps.apiKey || !deps.agentId) {
    return { ok: false, status: 503, error: "VOICE_NOT_CONFIGURED", message: "Voice conversations are not configured on this server." };
  }

  let signedUrl: { signedUrl: string };
  try {
    signedUrl = await deps.requestSignedUrl({ apiKey: deps.apiKey, agentId: deps.agentId });
  } catch (err) {
    const cause = err instanceof ElevenLabsProviderError ? err.message : "unknown error";
    logger.error({ scenarioSlug: scenario.slug, cause }, "ElevenLabs signed url request failed");
    return { ok: false, status: 502, error: "VOICE_PROVIDER_UNAVAILABLE", message: "Unable to start a voice session right now." };
  }

  try {
    const dynamicVariables = { ...buildArchitectConversationContext(scenario), ...buildStressLabFocusVariables(parsed.data.focus) };
    const result = VoiceSessionResponseSchema.parse({
      signedUrl: signedUrl.signedUrl,
      dynamicVariables,
    });
    return { ok: true, result };
  } catch (err) {
    logger.error({ scenarioSlug: scenario.slug, err: err instanceof Error ? err.message : "unknown" }, "Failed to prepare voice session response");
    return { ok: false, status: 500, error: "VOICE_SESSION_FAILED", message: "Unable to prepare the voice session." };
  }
}
