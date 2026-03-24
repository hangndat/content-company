/** Must match orchestrator TREND_GRAPH_STEPS and replay API. */
export const TREND_REPLAY_STEPS = ["normalize", "aggregate", "embedRefine"] as const;
export type TrendReplayStep = (typeof TREND_REPLAY_STEPS)[number];

export const TREND_REPLAY_LABELS: Record<TrendReplayStep, string> = {
  normalize: "Từ đầu (normalize → aggregate → embedRefine)",
  aggregate: "Từ aggregate (dùng snapshot sau normalize)",
  embedRefine: "Từ embedRefine (dùng snapshot sau aggregate)",
};
