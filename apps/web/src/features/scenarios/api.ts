import { z } from "zod";
import { ScenarioPreviewSchema, PublicReviewScenarioSchema } from "@redline/shared";
import { apiGet } from "../../lib/api/client.js";

export function getScenarioPreviews() {
  return apiGet("/api/scenarios", (data) => z.array(ScenarioPreviewSchema).parse(data));
}

export function getScenarioBySlug(slug: string) {
  return apiGet(`/api/scenarios/${encodeURIComponent(slug)}`, (data) => PublicReviewScenarioSchema.parse(data));
}
