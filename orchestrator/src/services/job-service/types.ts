import type { JobQueueService } from "../job-queue.js";
import type { RunJobBody, RunTrendJobBody } from "../../api/schemas.js";

export type JobServiceDeps = {
  db: import("@prisma/client").PrismaClient;
  redis: import("ioredis").Redis;
  logger: import("pino").Logger;
  env: import("../../config/env.js").Env;
  jobQueue?: JobQueueService;
};

export type RunJobResult = {
  jobId: string;
  traceId: string;
  status: string;
  decision?: string;
  createdAt: Date;
  completedAt?: Date;
  duplicate: boolean;
};

export type ApproveRejectInput = {
  actor: string;
  reason?: string;
};

export type JobInputNormalizedSummary = {
  domain?: string;
  channel?: { id?: string; type?: string };
  rawItemsCount?: number;
};

export type JobApprovalRow = {
  id: string;
  action: string;
  actor: string;
  reason: string | null;
  createdAt: Date;
};

/** Entity draft (content pipeline output), bảng `content_draft`. */
export type JobContentDraftRow = {
  id: string;
  outline: string | null;
  body: string | null;
  reviewNotes: string | null;
  decision: string | null;
  topicScore: number | null;
  reviewScore: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type JobDetailResult = {
  job: GetJobResult;
  input: {
    rawPayload: { rawItems?: unknown[] };
    normalizedSummary?: JobInputNormalizedSummary;
  } | null;
  steps: Array<{
    id: string;
    step: string;
    createdAt: Date;
    stateJson: Record<string, unknown>;
  }>;
  approvals: JobApprovalRow[];
  contentDraft: JobContentDraftRow | null;
};

export type JobListItem = {
  id: string;
  traceId: string;
  status: string;
  decision: string | null;
  sourceType: string;
  createdAt: Date;
  completedAt: Date | null;
  retryCount: number;
  topicScore: number | null;
  reviewScore: number | null;
  trendCandidateCount?: number;
  trendTopTopic?: string;
};

export type RunTrendJobInput = RunTrendJobBody & {
  jobId: string;
  traceId: string;
  idempotencyKey?: string;
};

export interface JobService {
  runJob(input: RunJobInput): Promise<RunJobResult>;
  runTrendJob(input: RunTrendJobInput): Promise<RunJobResult>;
  getJob(jobId: string): Promise<GetJobResult | null>;
  getJobDetail(jobId: string): Promise<JobDetailResult | null>;
  listJobs(opts?: {
    limit?: number;
    offset?: number;
    status?: string;
    sourceType?: string;
  }): Promise<{ items: JobListItem[]; total: number }>;
  replayJob(jobId: string, fromStep?: string): Promise<ReplayResult | null>;
  approveJob(jobId: string, input: ApproveRejectInput): Promise<{ jobId: string } | null>;
  rejectJob(jobId: string, input: { actor: string; reason: string }): Promise<{ jobId: string } | null>;
}

export type RunJobInput = RunJobBody & {
  jobId: string;
  traceId: string;
  idempotencyKey?: string;
};

export type GetJobResult = {
  id: string;
  traceId: string;
  status: string;
  decision: string | null;
  topicScore: unknown;
  reviewScore: unknown;
  retryCount: number;
  sourceType: string;
  createdAt: Date;
  completedAt: Date | null;
  outputs: { outline: string | null; draft: string | null; reviewNotes: string | null } | null;
};

export type ReplayResult = {
  jobId: string;
  traceId: string;
  status: string;
  createdAt: Date;
  conflict?: boolean;
};
