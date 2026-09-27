import { z } from "zod";

// Wire shapes for the leaderboard feature. score/rank are always server-
// derived from persisted practice scenario results - never accepted from a
// client request.

export const LeaderboardEntryRowSchema = z.object({
  rank: z.number().int().positive(),
  displayName: z.string().min(1),
  avatarUrl: z.string().min(1).nullable(),
  score: z.number().int(),
  scenariosCompleted: z.number().int().nonnegative().optional(),
  isCurrentUser: z.boolean(),
});
export type LeaderboardEntryRow = z.infer<typeof LeaderboardEntryRowSchema>;

export const LeaderboardProfileSchema = z.object({
  displayName: z.string(),
  avatarUrl: z.string().min(1).nullable(),
  optedIn: z.boolean(),
});
export type LeaderboardProfile = z.infer<typeof LeaderboardProfileSchema>;

// Either submit a display name (opts in / renames), or explicitly opt out.
export const UpdateLeaderboardProfileRequestSchema = z.union([
  z.object({ displayName: z.string().min(1).max(40) }),
  z.object({ optedIn: z.literal(false) }),
]);
export type UpdateLeaderboardProfileRequest = z.infer<typeof UpdateLeaderboardProfileRequestSchema>;
