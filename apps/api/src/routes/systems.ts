import { Router } from "express";
import { getUserId } from "../middleware/auth.js";
import type { SystemRepository } from "../services/systemRepository.js";
import { listSystems, getSystem, createSystem, updateSystem, type ServiceResult } from "../services/systemService.js";

function respond(res: import("express").Response, result: ServiceResult<unknown>): void {
  if (!result.ok) {
    res.status(result.status).json({ error: result.error, message: result.message });
    return;
  }
  res.json(result.result);
}

export function createSystemsRouter(repository: SystemRepository): Router {
  const router = Router();

  router.get("/", async (req, res) => {
    res.json(await listSystems(repository, getUserId(req)));
  });

  router.post("/", async (req, res) => {
    respond(res, await createSystem(repository, getUserId(req), req.body));
  });

  router.get("/:id", async (req, res) => {
    respond(res, await getSystem(repository, getUserId(req), req.params.id));
  });

  router.patch("/:id", async (req, res) => {
    respond(res, await updateSystem(repository, getUserId(req), req.params.id, req.body));
  });

  return router;
}
