import type { LeaderboardEntryRow, UpdateLeaderboardProfileRequest, LeaderboardProfile } from "@redline/shared";
import { getPracticeScenarioById, listPracticeScenarios } from "@redline/scenarios";
import type { LeaderboardRepository } from "./leaderboardRepository.js";

export type ServiceFailure = { ok: false; status: number; error: string; message: string };
export type ServiceResult<T> = { ok: true; result: T } | ServiceFailure;

const notFound = (message: string): ServiceFailure => ({ ok: false, status: 404, error: "not_found", message });
const badRequest = (error: string, message: string): ServiceFailure => ({ ok: false, status: 400, error, message });

// A user must have completed at least this many of the practice scenarios
// to appear on the ranked overall leaderboard - otherwise a single lucky
// 100 would outrank someone with a lower but broader average.
const MIN_SCENARIOS_FOR_OVERALL_RANKING = 2;

// eslint-disable-next-line no-control-regex -- deliberately matching control characters to reject them
const CONTROL_CHARACTERS = /[\x00-\x1F\x7F]/;

export function normalizeScore(objectiveScore: number, objectiveMaxScore: number): number {
  return Math.round((objectiveScore / objectiveMaxScore) * 100);
}

/** Called only when an attempt transitions to completed - never from submit. */
export async function recordScenarioCompletion(
  leaderboardRepo: LeaderboardRepository,
  userId: string,
  practiceScenarioId: string,
  attemptId: string,
  objectiveScore: number,
  objectiveMaxScore: number,
): Promise<void> {
  await leaderboardRepo.recordBestScore({
    userId,
    practiceScenarioId,
    attemptId,
    objectiveScore,
    objectiveMaxScore,
    normalizedScore: normalizeScore(objectiveScore, objectiveMaxScore),
  });
}

function validateDisplayName(raw: string): { ok: true; value: string } | { ok: false; message: string } {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ok: false, message: "Display name cannot be empty." };
  if (trimmed.length > 40) return { ok: false, message: "Display name must be 40 characters or fewer." };
  if (CONTROL_CHARACTERS.test(trimmed)) return { ok: false, message: "Display name contains invalid characters." };
  return { ok: true, value: trimmed };
}

// Standard competition ranking (1, 1, 3): a tied pair shares a rank, and the
// next distinct score skips ahead by the number of ties. Small dataset, so
// plain sort + scan beats a SQL window function.
function assignRanks<T extends { score: number }>(sorted: T[]): (T & { rank: number })[] {
  const ranked: (T & { rank: number })[] = [];
  let rank = 0;
  let previousScore: number | null = null;
  sorted.forEach((entry, index) => {
    if (previousScore === null || entry.score !== previousScore) rank = index + 1;
    previousScore = entry.score;
    ranked.push({ ...entry, rank });
  });
  return ranked;
}

async function displayNameFor(leaderboardRepo: LeaderboardRepository, userId: string): Promise<{ displayName: string; avatarUrl: string | null }> {
  const profile = await leaderboardRepo.getProfile(userId);
  return { displayName: profile?.displayName || "Anonymous Engineer", avatarUrl: profile?.avatarUrl ?? null };
}

export async function getScenarioLeaderboard(
  leaderboardRepo: LeaderboardRepository,
  userId: string,
  practiceScenarioId: string,
): Promise<ServiceResult<LeaderboardEntryRow[]>> {
  if (!getPracticeScenarioById(practiceScenarioId)) {
    return notFound(`No practice scenario matches id: ${practiceScenarioId}`);
  }

  const entries = await leaderboardRepo.listScenarioLeaderboard(practiceScenarioId);
  const withNames = await Promise.all(
    entries.map(async (e) => ({ userId: e.userId, score: e.normalizedScore, ...(await displayNameFor(leaderboardRepo, e.userId)) })),
  );
  const ranked = assignRanks(withNames);

  const rows: LeaderboardEntryRow[] = ranked.map((entry) => ({
    rank: entry.rank,
    displayName: entry.displayName,
    avatarUrl: entry.avatarUrl,
    score: entry.score,
    isCurrentUser: entry.userId === userId,
  }));
  return { ok: true, result: rows };
}

export async function getOverallLeaderboard(
  leaderboardRepo: LeaderboardRepository,
  userId: string,
): Promise<ServiceResult<LeaderboardEntryRow[]>> {
  const entries = await leaderboardRepo.listOverallLeaderboard();
  const totalScenarios = listPracticeScenarios().length;

  const byUser = new Map<string, number[]>();
  for (const entry of entries) {
    const scores = byUser.get(entry.userId) ?? [];
    scores.push(entry.normalizedScore);
    byUser.set(entry.userId, scores);
  }

  const aggregated = await Promise.all(
    [...byUser.entries()]
      .filter(([, scores]) => scores.length >= Math.min(MIN_SCENARIOS_FOR_OVERALL_RANKING, totalScenarios))
      .map(async ([aggUserId, scores]) => ({
        userId: aggUserId,
        score: Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length),
        scenariosCompleted: scores.length,
        ...(await displayNameFor(leaderboardRepo, aggUserId)),
      })),
  );

  const sorted = aggregated.sort((a, b) => b.score - a.score);
  const ranked = assignRanks(sorted);

  const rows: LeaderboardEntryRow[] = ranked.map((entry) => ({
    rank: entry.rank,
    displayName: entry.displayName,
    avatarUrl: entry.avatarUrl,
    score: entry.score,
    scenariosCompleted: entry.scenariosCompleted,
    isCurrentUser: entry.userId === userId,
  }));
  return { ok: true, result: rows };
}

export async function getProfile(leaderboardRepo: LeaderboardRepository, userId: string): Promise<ServiceResult<LeaderboardProfile>> {
  const existing = await leaderboardRepo.getProfile(userId);
  const profile = existing ?? (await leaderboardRepo.upsertProfile(userId, {}));
  return { ok: true, result: { displayName: profile.displayName, avatarUrl: profile.avatarUrl, optedIn: profile.optedIn } };
}

export async function updateProfile(
  leaderboardRepo: LeaderboardRepository,
  userId: string,
  request: UpdateLeaderboardProfileRequest,
): Promise<ServiceResult<LeaderboardProfile>> {
  if ("optedIn" in request) {
    const updated = await leaderboardRepo.upsertProfile(userId, { optedIn: false });
    return { ok: true, result: { displayName: updated.displayName, avatarUrl: updated.avatarUrl, optedIn: updated.optedIn } };
  }

  const validated = validateDisplayName(request.displayName);
  if (!validated.ok) return badRequest("invalid_display_name", validated.message);

  const updated = await leaderboardRepo.upsertProfile(userId, { displayName: validated.value, optedIn: true });
  return { ok: true, result: { displayName: updated.displayName, avatarUrl: updated.avatarUrl, optedIn: updated.optedIn } };
}
