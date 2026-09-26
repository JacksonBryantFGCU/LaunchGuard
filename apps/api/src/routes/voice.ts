import { Router } from "express";
import { ZodError } from "zod";
import { createVoiceSession, VoiceError, type VoiceErrorCode } from "../services/voiceService.js";

export const voiceRouter = Router();

const STATUS_BY_CODE: Record<VoiceErrorCode, number> = {
  INVALID_SCENARIO: 400,
  VOICE_CONFIGURATION_MISSING: 503,
  VOICE_PROVIDER_UNAVAILABLE: 502,
};

voiceRouter.post("/sessions", async (req, res, next) => {
  try {
    const result = await createVoiceSession(req.body);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "invalid_request", message: "The voice session request failed validation." });
      return;
    }
    if (error instanceof VoiceError) {
      res.status(STATUS_BY_CODE[error.code]).json({ error: error.code, message: error.message });
      return;
    }
    next(error);
  }
});
