import { Prisma } from "@prisma/client";
import type { createJobRepo } from "../../repos/job.js";
import type { createJobSnapshotRepo } from "../../repos/job-snapshot.js";
import type { PrismaClient } from "@prisma/client";
import type { GetJobResult, JobDetailResult, JobListItem } from "./types.js";

export type ReadCtx = {
  db: PrismaClient;
  jobRepo: ReturnType<typeof createJobRepo>;
  snapshotRepo: ReturnType<typeof createJobSnapshotRepo>;
};

export async function getJob(jobId: string, ctx: ReadCtx): Promise<GetJobResult | null> {
  const job = await ctx.jobRepo.findById(jobId);
  if (!job) return null;
  return {
    id: job.id,
    traceId: job.traceId,
    status: job.status,
    decision: job.decision,
    topicScore: job.topicScore,
    reviewScore: job.reviewScore,
    retryCount: job.retryCount,
    sourceType: job.sourceType,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
    outputs: job.outputs,
  };
}

export async function getJobDetail(jobId: string, ctx: ReadCtx): Promise<JobDetailResult | null> {
  const job = await ctx.jobRepo.findById(jobId);
  if (!job) return null;
  const snapshots = await ctx.snapshotRepo.listByJobId(jobId);
  return {
    job: {
      id: job.id,
      traceId: job.traceId,
      status: job.status,
      decision: job.decision,
      topicScore: job.topicScore,
      reviewScore: job.reviewScore,
      retryCount: job.retryCount,
      sourceType: job.sourceType,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      outputs: job.outputs,
    },
    input: job.inputs
      ? { rawPayload: (job.inputs.rawPayload as { rawItems?: unknown[] }) ?? {} }
      : null,
    steps: snapshots.map((s) => ({
      id: s.id,
      step: s.step,
      createdAt: s.createdAt,
      stateJson: (s.stateJson as Record<string, unknown>) ?? {},
    })),
  };
}

export async function listJobs(
  opts: { limit?: number; offset?: number; status?: string } | undefined,
  ctx: ReadCtx
): Promise<{ items: JobListItem[] }> {
  const { db } = ctx;
  const limit = Math.min(Number(opts?.limit) || 20, 100);
  const offset = Math.max(0, Number(opts?.offset) || 0);
  const status = opts?.status?.trim() || null;

  const whereSql = status ? Prisma.sql`WHERE j.status = ${status}` : Prisma.empty;

  const rows = await db.$queryRaw<
    Array<{
      id: string;
      status: string;
      decision: string | null;
      source_type: string;
      created_at: Date;
      completed_at: Date | null;
      trend_candidate_count: bigint | null;
      trend_top_topic: string | null;
    }>
  >(Prisma.sql`
        SELECT
          j.id,
          j.status,
          j.decision,
          j.source_type,
          j.created_at,
          j.completed_at,
          CASE
            WHEN j.source_type = 'trend_aggregate' THEN
              jsonb_array_length(COALESCE(jo.trend_candidates, '[]'::jsonb))
            ELSE NULL
          END AS trend_candidate_count,
          CASE
            WHEN j.source_type = 'trend_aggregate' THEN jo.trend_candidates->0->>'topic'
            ELSE NULL
          END AS trend_top_topic
        FROM "Job" j
        LEFT JOIN "JobOutput" jo ON jo.job_id = j.id
        ${whereSql}
        ORDER BY j.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);

  return {
    items: rows.map((r) => ({
      id: r.id,
      status: r.status,
      decision: r.decision,
      sourceType: r.source_type,
      createdAt: r.created_at,
      completedAt: r.completed_at,
      trendCandidateCount:
        r.source_type === "trend_aggregate" && r.trend_candidate_count != null
          ? Number(r.trend_candidate_count)
          : undefined,
      trendTopTopic:
        r.source_type === "trend_aggregate" && r.trend_top_topic ? r.trend_top_topic : undefined,
    })),
  };
}
