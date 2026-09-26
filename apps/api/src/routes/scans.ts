import { Router } from "express";
import { ScanRequest } from "@launchguard/shared";
import { analyzeProject } from "../services/scanService.js";

export const scansRouter = Router();

scansRouter.post("/analyze", (req, res, next) => {
  const parsed = ScanRequest.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }

  try {
    res.json(analyzeProject(parsed.data));
  } catch (err) {
    next(err);
  }
});
