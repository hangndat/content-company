export const NODE_TYPES = ["planner", "scorer", "writer", "reviewer"] as const;
export type NodeType = (typeof NODE_TYPES)[number];

export const SCOPES = ["global", "channel", "topic", "source_type"] as const;
export type Scope = (typeof SCOPES)[number];

export const EXPERIMENT_STATUS = {
  DRAFT: "draft",
  RUNNING: "running",
  PAUSED: "paused",
  COMPLETED: "completed",
} as const;
