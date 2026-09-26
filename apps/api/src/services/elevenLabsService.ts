const ELEVENLABS_API_BASE = "https://api.elevenlabs.io";

export class ElevenLabsProviderError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ElevenLabsProviderError";
  }
}

interface CreateSignedConversationUrlInput {
  apiKey: string;
  agentId: string;
}

interface CreateSignedConversationUrlResult {
  signedUrl: string;
}

// Talks to ElevenLabs only. Knows nothing about Redline scenarios - it just
// exchanges an API key + agent ID for a short-lived signed conversation URL,
// so the API key never has to reach the browser.
export async function createSignedConversationUrl({
  apiKey,
  agentId,
}: CreateSignedConversationUrlInput): Promise<CreateSignedConversationUrlResult> {
  let res: Response;
  try {
    res = await fetch(
      `${ELEVENLABS_API_BASE}/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`,
      {
        method: "GET",
        headers: { "xi-api-key": apiKey },
      },
    );
  } catch (cause) {
    throw new ElevenLabsProviderError("Unable to reach the ElevenLabs API.", cause);
  }

  if (!res.ok) {
    throw new ElevenLabsProviderError(`ElevenLabs API responded with status ${res.status}.`);
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch (cause) {
    throw new ElevenLabsProviderError("Received a malformed response from ElevenLabs.", cause);
  }

  const signedUrl = (data as { signed_url?: unknown } | null)?.signed_url;
  if (typeof signedUrl !== "string" || signedUrl.length === 0) {
    throw new ElevenLabsProviderError("ElevenLabs response did not include a signed URL.");
  }

  return { signedUrl };
}
