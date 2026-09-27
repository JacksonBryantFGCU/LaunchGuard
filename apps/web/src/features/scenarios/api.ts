import { z } from "zod";
import { ArchitectureScenarioPreviewSchema, PublicArchitectureScenarioSchema } from "@purgatory/shared";
import { apiGet } from "../../lib/api/client.js";

export function getScenarioPreviews() {
  return apiGet("/api/scenarios", (data) => z.array(ArchitectureScenarioPreviewSchema).parse(data));
}

export function getScenarioBySlug(slug: string) {
  return apiGet(`/api/scenarios/${encodeURIComponent(slug)}`, (data) => PublicArchitectureScenarioSchema.parse(data));
}
