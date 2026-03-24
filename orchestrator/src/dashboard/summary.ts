import type { PrismaClient } from "@prisma/client";

export type SummaryTimeRange = {
  from: string;
  to: string;
};

export type DashboardSummaryResult = {
  generatedAt: string;
  timeRange: SummaryTimeRange;
  semantics: {
    cohortBy: string;
    reviewScoreScale: string;
    smoothedCtrFormula: string;
    approveRateBase: string;
  };
  jobs: {
    created: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    approved: number;
    reviewRequired: number;
    rejected: number;
    retryCountGT0: number;
    avgProcessingMs: number | null;
  };
  publish: {
    success: number;
    failed: number;
    duplicateBlocked: number | null;
  };
  queue: {
    waiting: number;
    active: number;
    delayed: number;
    failed: number;
    completed: number;
    paused: number;
  } | null;
};

export type GetSummaryInput = {
  days?: number;
  from?: string;
  to?: string;
  queueCounts?: {
    wait?: number;
    active?: number;
    delayed?: number;
    failed?: number;
    completed?: number;
    paused?: number;
  } | null;
};

function resolveTimeRange(input: GetSummaryInput): { from: Date; to: Date } {
  const to = input.to ? new Date(input.to) : new Date();
  to.setHours(23, 59, 59, 999);

  let from: Date;
  if (input.from) {
    from = new Date(input.from);
    from.setHours(0, 0, 0, 0);
  } else {
    const days = input.days ?? 1;
    from = new Date(to);
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);
  }

  return { from, to };
}

export async function getDashboardSummary(
  db: PrismaClient,
  input: GetSummaryInput
): Promise<DashboardSummaryResult> {
  const { from, to } = resolveTimeRange(input);

  const [jobCounts, decisionCounts, retryCount, publishCounts, queueCounts] =
    await Promise.all([
      db.job.groupBy({
        by: ["status"],
        where: { createdAt: { gte: from, lte: to } },
        _count: { id: true },
      }),
      db.job.groupBy({
        by: ["decision"],
        where: {
          createdAt: { gte: from, lte: to },
          decision: { not: null },
        },
        _count: { id: true },
      }),
      db.job.count({
        where: {
          createdAt: { gte: from, lte: to },
          retryCount: { gt: 0 },
        },
      }),
      db.publishedContent.groupBy({
        by: ["status"],
        where: {
          createdAt: { gte: from, lte: to },
        },
        _count: { id: true },
      }),
      Promise.resolve(input.queueCounts ?? null),
    ]);

  const created = await db.job.count({
    where: { createdAt: { gte: from, lte: to } },
  });

  const statusMap = Object.fromEntries(
    jobCounts.map((r) => [r.status, r._count.id])
  );
  const decisionMap = Object.fromEntries(
    decisionCounts.map((r) => [r.decision!, r._count.id])
  );
  const publishMap = Object.fromEntries(
    publishCounts.map((r) => [r.status, r._count.id])
  );

  const jobs = {
    created,
    pending: statusMap.pending ?? 0,
    processing: statusMap.processing ?? 0,
    completed: statusMap.completed ?? 0,
    failed: statusMap.failed ?? 0,
    approved: decisionMap.APPROVED ?? 0,
    reviewRequired: decisionMap.REVIEW_REQUIRED ?? 0,
    rejected: decisionMap.REJECTED ?? 0,
    retryCountGT0: retryCount,
    avgProcessingMs: null as number | null,
  };

  const jobsWithCompleted = await db.job.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      completedAt: { not: null },
    },
    select: {
      createdAt: true,
      completedAt: true,
    },
  });

  if (jobsWithCompleted.length > 0) {
    const totalMs = jobsWithCompleted.reduce((sum, j) => {
      const created = j.createdAt.getTime();
      const completed = j.completedAt!.getTime();
      return sum + (completed - created);
    }, 0);
    jobs.avgProcessingMs = Math.round(totalMs / jobsWithCompleted.length);
  }

  const publish = {
    success: publishMap.published ?? 0,
    failed: Object.entries(publishMap).reduce(
      (acc, [k, v]) => (k !== "published" ? acc + v : acc),
      0
    ),
    duplicateBlocked: null as number | null,
  };

  const queue = queueCounts
    ? {
        waiting: queueCounts.wait ?? 0,
        active: queueCounts.active ?? 0,
        delayed: queueCounts.delayed ?? 0,
        failed: queueCounts.failed ?? 0,
        completed: queueCounts.completed ?? 0,
        paused: queueCounts.paused ?? 0,
      }
    : null;

  return {
    generatedAt: new Date().toISOString(),
    timeRange: {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    },
    semantics: {
      cohortBy: "job_creation_date",
      reviewScoreScale: "0..1",
      smoothedCtrFormula: "(clicks + 1) / (views + 10)",
      approveRateBase: "jobsCount",
    },
    jobs,
    publish,
    queue,
  };
}
