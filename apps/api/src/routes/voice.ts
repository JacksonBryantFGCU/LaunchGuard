import { Router } from "express";
import { createVoiceSession } from "../services/voiceSessionService.js";

export const voiceRouter = Router();

voiceRouter.post("/sessions", async (req, res) => {
  const result = await createVoiceSession(req.body);
  if (!result.ok) {
    res.status(result.status).json({ error: result.error, message: result.message });
    return;
  }
  res.status(201).json(result.result);
});
