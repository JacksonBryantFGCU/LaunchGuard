-- Resilience scoring (Phase 8): Stress Lab outcomes now count toward the
-- score, not just the written response - see evaluateResilience and
-- combineScenarioEvaluation in packages/scenarios. No column changes: the
-- leaderboard has always just stored "the score used for ranking" as two
-- plain integers, and the API now writes total_score (written response +
-- resilience) into them instead of the written response alone. This
-- migration only documents that at the schema level.
comment on column leaderboard_entries.objective_score is
  'Total score at completion (written response + resilience), despite the column name - see combineScenarioEvaluation in packages/scenarios.';
comment on column leaderboard_entries.objective_max_score is
  'Total max score at completion (written response + resilience), despite the column name - see combineScenarioEvaluation in packages/scenarios.';
