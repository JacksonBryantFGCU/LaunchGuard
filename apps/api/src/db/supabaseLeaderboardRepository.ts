import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  LeaderboardEntryRecord,
  LeaderboardProfilePatch,
  LeaderboardProfileRecord,
  LeaderboardRepository,
  RecordBestScoreInput,
} from "../services/leaderboardRepository.js";

// Never leak a raw Supabase/Postgres error to callers - same pattern as
// SupabasePracticeScenarioRepository's RepositoryError.
class RepositoryError extends Error {
  constructor(operation: string, cause: unknown) {
    super(`Leaderboard repository operation failed: ${operation}`);
    this.name = "RepositoryError";
    this.cause = cause;
  }
}

interface ProfileRow {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  leaderboard_opt_in: boolean;
}

interface EntryRow {
  user_id: string;
  practice_scenario_id: string;
  normalized_score: number;
}

const toProfileRecord = (row: ProfileRow): LeaderboardProfileRecord => ({
  userId: row.user_id,
  displayName: row.display_name,
  avatarUrl: row.avatar_url,
  optedIn: row.leaderboard_opt_in,
});

const toEntryRecord = (row: EntryRow): LeaderboardEntryRecord => ({
  userId: row.user_id,
  practiceScenarioId: row.practice_scenario_id,
  normalizedScore: row.normalized_score,
});

export class SupabaseLeaderboardRepository implements LeaderboardRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getProfile(userId: string): Promise<LeaderboardProfileRecord | undefined> {
    const { data, error } = await this.client.from("leaderboard_profiles").select().eq("user_id", userId).maybeSingle();
    if (error) throw new RepositoryError("getProfile", error);
    return data ? toProfileRecord(data as ProfileRow) : undefined;
  }

  async upsertProfile(userId: string, patch: LeaderboardProfilePatch): Promise<LeaderboardProfileRecord> {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.displayName !== undefined) row.display_name = patch.displayName;
    if (patch.optedIn !== undefined) row.leaderboard_opt_in = patch.optedIn;

    const existing = await this.getProfile(userId);
    const { data, error } = await this.client
      .from("leaderboard_profiles")
      .upsert(
        {
          user_id: userId,
          display_name: existing?.displayName ?? "",
          avatar_url: existing?.avatarUrl ?? null,
          leaderboard_opt_in: existing?.optedIn ?? false,
          ...row,
        },
        { onConflict: "user_id" },
      )
      .select()
      .maybeSingle();
    if (error || !data) throw new RepositoryError("upsertProfile", error);
    return toProfileRecord(data as ProfileRow);
  }

  // Read-then-write "keep the higher score" guard: acceptable at this scale
  // (mirrors how other repositories in this codebase handle non-hot-path
  // read-then-write operations) - no distributed locking needed.
  async recordBestScore(input: RecordBestScoreInput): Promise<void> {
    // leaderboard_entries.user_id has a FK into leaderboard_profiles (so the
    // listScenarioLeaderboard/listOverallLeaderboard embed can resolve the
    // relationship) - ensure a default, opted-out profile row exists first
    // for users who have never touched /api/leaderboard/profile yet.
    const { error: ensureProfileError } = await this.client
      .from("leaderboard_profiles")
      .upsert(
        { user_id: input.userId, display_name: "", avatar_url: null, leaderboard_opt_in: false },
        { onConflict: "user_id", ignoreDuplicates: true },
      );
    if (ensureProfileError) throw new RepositoryError("recordBestScore:ensureProfile", ensureProfileError);

    const { data: existing, error: readError } = await this.client
      .from("leaderboard_entries")
      .select("normalized_score")
      .eq("user_id", input.userId)
      .eq("practice_scenario_id", input.practiceScenarioId)
      .maybeSingle();
    if (readError) throw new RepositoryError("recordBestScore:read", readError);
    if (existing && (existing as { normalized_score: number }).normalized_score >= input.normalizedScore) return;

    const now = new Date().toISOString();
    const { error } = await this.client.from("leaderboard_entries").upsert(
      {
        user_id: input.userId,
        practice_scenario_id: input.practiceScenarioId,
        attempt_id: input.attemptId,
        objective_score: input.objectiveScore,
        objective_max_score: input.objectiveMaxScore,
        normalized_score: input.normalizedScore,
        achieved_at: now,
        updated_at: now,
      },
      { onConflict: "user_id,practice_scenario_id" },
    );
    if (error) throw new RepositoryError("recordBestScore:write", error);
  }

  async listScenarioLeaderboard(practiceScenarioId: string): Promise<LeaderboardEntryRecord[]> {
    const { data, error } = await this.client
      .from("leaderboard_entries")
      .select("user_id, practice_scenario_id, normalized_score, leaderboard_profiles!inner(leaderboard_opt_in)")
      .eq("practice_scenario_id", practiceScenarioId)
      .eq("leaderboard_profiles.leaderboard_opt_in", true)
      .order("normalized_score", { ascending: false });
    if (error) throw new RepositoryError("listScenarioLeaderboard", error);
    return (data as EntryRow[]).map(toEntryRecord);
  }

  async listOverallLeaderboard(): Promise<LeaderboardEntryRecord[]> {
    const { data, error } = await this.client
      .from("leaderboard_entries")
      .select("user_id, practice_scenario_id, normalized_score, leaderboard_profiles!inner(leaderboard_opt_in)")
      .eq("leaderboard_profiles.leaderboard_opt_in", true)
      .order("normalized_score", { ascending: false });
    if (error) throw new RepositoryError("listOverallLeaderboard", error);
    return (data as EntryRow[]).map(toEntryRecord);
  }
}
