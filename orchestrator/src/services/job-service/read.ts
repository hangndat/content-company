import { Prisma } from "@prisma/client";
import type { createJobRepo } from "../../repos/job.js";
import type { createJobSnapshotRepo } from "../../repos/job-snapshot.js";
import type { createApprovalRepo } from "../../repos/approval.js";
import type { PrismaClient } from "@prisma/client";
import type {
  GetJobResult,
  JobDetailResult,
  JobInputNormalizedSummary,
  JobListItem,
} from "./types.js";
import type { TrendCandidate } from "../../trends/trend-candidate.js";
import { trendTopicFingerprint } from "../../trends/topic-fingerprint.js";
import { DEFAULT_TREND_DOMAIN } from "../../trends/domain-profiles.js";

export type ReadCtx = {
  db: PrismaClient;
  jobRepo: ReturnType<typeof createJobRepo>;
  snapshotRepo: ReturnType<typeof createJobSnapshotRepo>;
  approvalRepo: ReturnType<typeof createApprovalRepo>;
};

function normalizedSummaryFromPayload(norm: unknown): JobInputNormalizedSummary | undefined {
  if (norm == null || typeof norm !== "object") return undefined;
  const o = norm as Record<string, unknown>;
  const rawItems = o.rawItems;
  const rawItemsCount = Array.isArray(rawItems) ? rawItems.length : undefined;
  const domain = typeof o.domain === "string" ? o.domain : undefined;
  let channel: { id?: string; type?: string } | undefined;
  if (o.channel && typeof o.channel === "object") {
    const c = o.channel as Record<string, unknown>;
    const id = typeof c.id === "string" ? c.id : undefined;
    const type = typeof c.type === "string" ? c.type : undefined;
    if (id != null || type != null) channel = { id, type };
  }
  if (domain == null && channel == null && rawItemsCount == null) return undefined;
  return { domain, channel, rawItemsCount };
}

function decimalToNumber(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

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
  const { db } = ctx;

  let outputs = job.outputs;
  if (
    job.sourceType === "trend_aggregate" &&
    outputs?.trendCandidates &&
    Array.isArray(outputs.trendCandidates) &&
    (outputs.trendCandidates as unknown[]).length > 0
  ) {
    const norm = job.inputs?.normalizedPayload as { domain?: string } | undefined;
    const trendDomain = norm?.domain ?? DEFAULT_TREND_DOMAIN;
    const candidates = outputs.trendCandidates as TrendCandidate[];
    const fingerprints = candidates.map((c) => trendTopicFingerprint(trendDomain, c.topic));
    const dupRows = await db.trendTopicObservation.groupBy({
      by: ["fingerprint"],
      where: { fingerprint: { in: fingerprints }, sourceJobId: { not: job.id } },
      _count: { _all: true },
    });
    const seenFp = new Set(dupRows.map((r) => r.fingerprint));
    const enriched = candidates.map((c) => ({
      ...c,
      seenBefore: seenFp.has(trendTopicFingerprint(trendDomain, c.topic)),
    }));
    outputs = { ...outputs, trendCandidates: enriched };
  }

  const approvalRows = await ctx.approvalRepo.listByJobId(jobId);
  const draftRow = await db.contentDraft.findUnique({ where: { jobId } });

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
      outputs,
    },
    input: job.inputs
      ? {
          rawPayload: (job.inputs.rawPayload as { rawItems?: unknown[] }) ?? {},
          normalizedSummary: normalizedSummaryFromPayload(job.inputs.normalizedPayload),
        }
      : null,
    steps: snapshots.map((s) => ({
      id: s.id,
      step: s.step,
      createdAt: s.createdAt,
      stateJson: (s.stateJson as Record<string, unknown>) ?? {},
    })),
    approvals: approvalRows.map((a) => ({
      id: a.id,
      action: a.action,
      actor: a.actor,
      reason: a.reason,
      createdAt: a.createdAt,
    })),
    contentDraft: draftRow
      ? {
          id: draftRow.id,
          outline: draftRow.outline,
          body: draftRow.body,
          reviewNotes: draftRow.reviewNotes,
          decision: draftRow.decision,
          topicScore: draftRow.topicScore != null ? Number(draftRow.topicScore) : null,
          reviewScore: draftRow.reviewScore != null ? Number(draftRow.reviewScore) : null,
          createdAt: draftRow.createdAt,
          updatedAt: draftRow.updatedAt,
        }
      : null,
  };
}

export async function listJobs(
  opts: { limit?: number; offset?: number; status?: string; sourceType?: string } | undefined,
  ctx: ReadCtx
): Promise<{ items: JobListItem[]; total: number }> {
  const { db } = ctx;
  const limit = Math.min(Number(opts?.limit) || 20, 100);
  const offset = Math.max(0, Number(opts?.offset) || 0);
  const status = opts?.status?.trim() || null;
  const sourceType = opts?.sourceType?.trim() || null;

  const conds: Prisma.Sql[] = [];
  if (status) conds.push(Prisma.sql`j.status = ${status}`);
  if (sourceType) conds.push(Prisma.sql`j.source_type = ${sourceType}`);
  const whereSql =
    conds.length > 0 ? Prisma.sql`WHERE ${Prisma.join(conds, " AND ")}` : Prisma.empty;

  const countRows = await db.$queryRaw<Array<{ c: bigint }>>(
    Prisma.sql`SELECT COUNT(*)::bigint AS c FROM "Job" j ${whereSql}`
  );
  const total = Number(countRows[0]?.c ?? 0);

  const rows = await db.$queryRaw<
    Array<{
      id: string;
      trace_id: string;
      status: string;
      decision: string | null;
      source_type: string;
      created_at: Date;
      completed_at: Date | null;
      retry_count: number;
      topic_score: unknown;
      review_score: unknown;
      trend_candidate_count: bigint | null;
      trend_top_topic: string | null;
    }>
  >(Prisma.sql`
        SELECT
          j.id,
          j.trace_id,
          j.status,
          j.decision,
          j.source_type,
          j.created_at,
          j.completed_at,
          j.retry_count,
          j.topic_score,
          j.review_score,
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
    total,
    items: rows.map((r) => ({
      id: r.id,
      traceId: r.trace_id,
      status: r.status,
      decision: r.decision,
      sourceType: r.source_type,
      createdAt: r.created_at,
      completedAt: r.completed_at,
      retryCount: r.retry_count,
      topicScore: decimalToNumber(r.topic_score),
      reviewScore: decimalToNumber(r.review_score),
      trendCandidateCount:
        r.source_type === "trend_aggregate" && r.trend_candidate_count != null
          ? Number(r.trend_candidate_count)
          : undefined,
      trendTopTopic:
        r.source_type === "trend_aggregate" && r.trend_top_topic ? r.trend_top_topic : undefined,
    })),
  };
}
