import { z } from "zod";
import { SystemSummarySchema, type SystemSummary, type CreateSystemInput, type UpdateSystemInput } from "@purgatory/shared";
import { apiGet, apiPost, apiPatch } from "../../lib/api/client.js";

export function getSystems(): Promise<SystemSummary[]> {
  return apiGet("/api/systems", (data) => z.array(SystemSummarySchema).parse(data), { authed: true });
}

export function getSystem(id: string): Promise<SystemSummary> {
  return apiGet(`/api/systems/${encodeURIComponent(id)}`, (data) => SystemSummarySchema.parse(data), { authed: true });
}

export function createSystem(input: CreateSystemInput): Promise<SystemSummary> {
  return apiPost("/api/systems", input, (data) => SystemSummarySchema.parse(data), { authed: true });
}

export function updateSystem(id: string, input: UpdateSystemInput): Promise<SystemSummary> {
  return apiPatch(`/api/systems/${encodeURIComponent(id)}`, input, (data) => SystemSummarySchema.parse(data), { authed: true });
}
