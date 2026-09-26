import { Router } from "express";
import { RepositoryScanRequest } from "@launchguard/shared";
import { scanRepositoryUrl } from "../services/scanService.js";

export const scansRouter = Router();

scansRouter.post("/", (req, res, next) => {
  const parsed = RepositoryScanRequest.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "INVALID_REPOSITORY_URL", issues: parsed.error.issues });
    return;
  }

  scanRepositoryUrl(parsed.data.repositoryUrl)
    .then((result) => res.json(result))
    .catch(next);
});
