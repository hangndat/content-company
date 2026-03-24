export const DECISION = {
  APPROVED: "APPROVED",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
  REJECTED: "REJECTED",
} as const;

export type Decision = (typeof DECISION)[keyof typeof DECISION];

/** Job lifecycle status. Separate from decision (outcome). */
export const JOB_STATUS = {
  PENDING: "pending",           // Queued, not started
  PROCESSING: "processing",     // Graph running
  REVIEW_REQUIRED: "review_required", // Graph done, awaiting human approval
  COMPLETED: "completed",       // Fully done (decision=approved|rejected)
  FAILED: "failed",
} as const;

export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];

export const SOURCE_TYPE = {
  RSS: "rss",
  WEBHOOK: "webhook",
  MANUAL: "manual",
  API: "api",
} as const;

export type SourceType = (typeof SOURCE_TYPE)[keyof typeof SOURCE_TYPE];

export const PUBLISH_POLICY = {
  AUTO: "auto",
  REVIEW_ONLY: "review_only",
  MANUAL_ONLY: "manual_only",
} as const;

export type PublishPolicy = (typeof PUBLISH_POLICY)[keyof typeof PUBLISH_POLICY];

// Decision thresholds for MVP
export const THRESHOLDS = {
  TOPIC_SCORE_REJECT: 0.4,
  REVIEW_SCORE_REJECT: 0.5,
  TOPIC_SCORE_APPROVE: 0.6,
  REVIEW_SCORE_APPROVE: 0.7,
  MAX_RETRY: 2,
} as const;

/** reviewScore and avgReviewScore scale: 0..1 (0 = worst, 1 = best) */
export const REVIEW_SCORE_SCALE = { min: 0, max: 1 } as const;

// Redis TTLs (seconds)
export const REDIS_TTL = {
  JOB_LOCK: 300,
  IDEMPOTENCY: 86400,
  SOURCE_DEDUPE: 3600,
  RATE_LIMIT_BUCKET: 3600, // 1 hour
  JOB_CACHE: 300,
  PUBLISH_DEDUPE: 604800, // 7 days - avoid reposting same content
} as const;

// Publish rate limits per channel type (posts per hour)
export const PUBLISH_RATE_LIMITS: Record<string, number> = {
  blog: 10,
  social: 5,
  affiliate: 3,
  default: 5,
};
