import type { PrismaClient } from "@prisma/client";

export type JobTrendsPoint = {
  date: string;
  created: number;
  completed: number;
  failed: number;
  approved: number;
  reviewRequired: number;
  rejected: number;
};

export type JobTrendsResult = {
  series: JobTrendsPoint[];
  semantics: {
    cohortBy: string;
    reviewScoreScale: string;
    smoothedCtrFormula: string;
    approveRateBase: string;
  };
};

export type GetJobTrendsInput = {
  days?: number;
  from?: string;
  to?: string;
  granularity?: "hour" | "day";
};

function formatBucket(date: Date, granularity: "hour" | "day"): string {
  if (granularity === "hour") {
    return date.toISOString().slice(0, 13) + ":00:00Z";
  }
  return date.toISOString().slice(0, 10);
}

export async function getJobTrends(
  db: PrismaClient,
  input: GetJobTrendsInput
): Promise<JobTrendsResult> {
  const days = input.days ?? 7;
  const granularity = input.granularity ?? "day";

  const to = input.to ? new Date(input.to) : new Date();
  to.setHours(23, 59, 59, 999);

  const from = input.from
    ? new Date(input.from)
    : (() => {
        const d = new Date(to);
        d.setDate(d.getDate() - days);
        return d;
      })();
  from.setHours(0, 0, 0, 0);

  const jobs = await db.job.findMany({
    where: { createdAt: { gte: from, lte: to } },
    select: {
      createdAt: true,
      status: true,
      decision: true,
      completedAt: true,
    },
  });

  const bucketMap = new Map<
    string,
    {
      created: number;
      completed: number;
      failed: number;
      approved: number;
      reviewRequired: number;
      rejected: number;
    }
  >();

  for (const j of jobs) {
    const bucket = formatBucket(j.createdAt, granularity);
    const existing = bucketMap.get(bucket) ?? {
      created: 0,
      completed: 0,
      failed: 0,
      approved: 0,
      reviewRequired: 0,
      rejected: 0,
    };
    existing.created += 1;

    if (j.status === "completed") {
      existing.completed += 1;
    } else if (j.status === "failed") {
      existing.failed += 1;
    }

    if (j.decision === "APPROVED") {
      existing.approved += 1;
    } else if (j.decision === "REVIEW_REQUIRED") {
      existing.reviewRequired += 1;
    } else if (j.decision === "REJECTED") {
      existing.rejected += 1;
    }

    bucketMap.set(bucket, existing);
  }

  const series = Array.from(bucketMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      ...data,
    }));

  return {
    series,
    semantics: {
      cohortBy: "job_creation_date",
      reviewScoreScale: "0..1",
      smoothedCtrFormula: "(clicks + 1) / (views + 10)",
      approveRateBase: "jobsCount",
    },
  };
}
