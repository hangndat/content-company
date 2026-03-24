import type { RunJobBody } from "../api/schemas.js";

export type GraphState = {
  jobId: string;
  traceId: string;
  sourceType: string;
  /** Trend job: domain profile (vd sports-vn). Content graph bỏ qua. */
  trendDomain?: string;
  topicHint?: string;
  rawItems: RunJobBody["rawItems"];
  publishPolicy: string;
  channel: RunJobBody["channel"];
  normalizedItems: NormalizedItem[];
  outline?: string;
  topicScore?: number;
  draft?: string;
  reviewScore?: number;
  reviewNotes?: string;
  riskFlag?: boolean;
  decision?: string;
  retryCount?: number;
  promptVersions?: Record<string, number>;
  experimentAssignments?: Record<string, import("../experiments/assignment-meta.js").ExperimentAssignmentMeta>;
}

export type NormalizedItem = {
  id: string;
  title: string;
  body: string;
  url?: string;
  publishedAt?: string;
  /** Ghi đè map hostname khi RSS đã có sourceId */
  sourceId?: string;
};

export type GraphContext = {
  db: import("@prisma/client").PrismaClient;
  redis: import("ioredis").Redis;
  logger: import("pino").Logger;
  env: import("../config/env.js").Env;
};
