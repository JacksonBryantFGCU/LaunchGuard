import { z } from "zod";
import {
  LeaderboardEntryRowSchema,
  LeaderboardProfileSchema,
  type LeaderboardEntryRow,
  type LeaderboardProfile,
  type UpdateLeaderboardProfileRequest,
} from "@redline/shared";
import { apiGet, apiPatch } from "../../lib/api/client.js";

export function getOverallLeaderboard(): Promise<LeaderboardEntryRow[]> {
  return apiGet("/api/leaderboard/overall", (data) => z.array(LeaderboardEntryRowSchema).parse(data), { authed: true });
}

export function getScenarioLeaderboard(scenarioId: string): Promise<LeaderboardEntryRow[]> {
  return apiGet(`/api/leaderboard/scenarios/${encodeURIComponent(scenarioId)}`, (data) => z.array(LeaderboardEntryRowSchema).parse(data), {
    authed: true,
  });
}

export function getLeaderboardProfile(): Promise<LeaderboardProfile> {
  return apiGet("/api/leaderboard/profile", (data) => LeaderboardProfileSchema.parse(data), { authed: true });
}

export function updateLeaderboardProfile(request: UpdateLeaderboardProfileRequest): Promise<LeaderboardProfile> {
  return apiPatch("/api/leaderboard/profile", request, (data) => LeaderboardProfileSchema.parse(data), { authed: true });
}
