export interface LeaderboardProfileRecord {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  optedIn: boolean;
}

export interface LeaderboardProfilePatch {
  displayName?: string;
  optedIn?: boolean;
}

export interface RecordBestScoreInput {
  userId: string;
  practiceScenarioId: string;
  attemptId: string;
  objectiveScore: number;
  objectiveMaxScore: number;
  normalizedScore: number;
}

export interface LeaderboardEntryRecord {
  userId: string;
  practiceScenarioId: string;
  normalizedScore: number;
}

export interface LeaderboardRepository {
  getProfile(userId: string): Promise<LeaderboardProfileRecord | undefined>;
  upsertProfile(userId: string, patch: LeaderboardProfilePatch): Promise<LeaderboardProfileRecord>;
  // Enforces "keep the higher score" itself - a lower later score must
  // never replace an existing higher one.
  recordBestScore(input: RecordBestScoreInput): Promise<void>;
  // Opted-in entries only, sorted by normalizedScore descending.
  listScenarioLeaderboard(practiceScenarioId: string): Promise<LeaderboardEntryRecord[]>;
  // Opted-in entries only, across every scenario every user has completed.
  listOverallLeaderboard(): Promise<LeaderboardEntryRecord[]>;
}

const defaultProfile = (userId: string): LeaderboardProfileRecord => ({
  userId,
  displayName: "",
  avatarUrl: null,
  optedIn: false,
});

// Deterministic, in-process only - lost on restart. Reference implementation
// for the contract tests, and the fallback for local dev without Supabase -
// same role InMemoryPracticeScenarioRepository plays for practice data.
export class InMemoryLeaderboardRepository implements LeaderboardRepository {
  private profiles = new Map<string, LeaderboardProfileRecord>();
  private entries = new Map<string, LeaderboardEntryRecord>();

  private entryKey(userId: string, practiceScenarioId: string): string {
    return `${userId}::${practiceScenarioId}`;
  }

  async getProfile(userId: string): Promise<LeaderboardProfileRecord | undefined> {
    return this.profiles.get(userId);
  }

  async upsertProfile(userId: string, patch: LeaderboardProfilePatch): Promise<LeaderboardProfileRecord> {
    const existing = this.profiles.get(userId) ?? defaultProfile(userId);
    const updated: LeaderboardProfileRecord = { ...existing, ...patch };
    this.profiles.set(userId, updated);
    return updated;
  }

  async recordBestScore(input: RecordBestScoreInput): Promise<void> {
    const key = this.entryKey(input.userId, input.practiceScenarioId);
    const existing = this.entries.get(key);
    if (existing && existing.normalizedScore >= input.normalizedScore) return;
    this.entries.set(key, {
      userId: input.userId,
      practiceScenarioId: input.practiceScenarioId,
      normalizedScore: input.normalizedScore,
    });
  }

  private isOptedIn(userId: string): boolean {
    return this.profiles.get(userId)?.optedIn ?? false;
  }

  async listScenarioLeaderboard(practiceScenarioId: string): Promise<LeaderboardEntryRecord[]> {
    return [...this.entries.values()]
      .filter((e) => e.practiceScenarioId === practiceScenarioId && this.isOptedIn(e.userId))
      .sort((a, b) => b.normalizedScore - a.normalizedScore);
  }

  async listOverallLeaderboard(): Promise<LeaderboardEntryRecord[]> {
    return [...this.entries.values()]
      .filter((e) => this.isOptedIn(e.userId))
      .sort((a, b) => b.normalizedScore - a.normalizedScore);
  }
}
