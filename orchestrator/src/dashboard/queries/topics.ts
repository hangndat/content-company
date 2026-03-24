import type { PrismaClient } from "@prisma/client";

export type TopicPerformanceItem = {
  topicKey: string;
  topicSignature: string;
  avgCtr: number;
  sampleCount: number;
  avgReviewScore: number | null;
};

export type TopicsResult = {
  items: TopicPerformanceItem[];
  semantics: {
    cohortBy: string;
    reviewScoreScale: string;
    smoothedCtrFormula: string;
    approveRateBase: string;
  };
};

export type GetTopicsInput = {
  days?: number;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
  sortBy?: "avgCtr" | "sampleCount" | "avgReviewScore";
  sortOrder?: "asc" | "desc";
};

function resolveTimeRange(input: GetTopicsInput): { from: Date; to: Date } {
  const to = input.to ? new Date(input.to) : new Date();
  to.setHours(23, 59, 59, 999);

  let from: Date;
  if (input.from) {
    from = new Date(input.from);
    from.setHours(0, 0, 0, 0);
  } else {
    const days = input.days ?? 7;
    from = new Date(to);
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);
  }

  return { from, to };
}

export async function getTopicPerformance(
  db: PrismaClient,
  input: GetTopicsInput
): Promise<TopicsResult> {
  const { from, to } = resolveTimeRange(input);
  const limit = Math.min(input.limit ?? 20, 100);
  const offset = input.offset ?? 0;
  const sortBy = input.sortBy ?? "avgCtr";
  const sortOrder = input.sortOrder ?? "desc";

  const records = await db.dailyTopicMetric.findMany({
    where: { metricDate: { gte: from, lte: to } },
    select: {
      topicKey: true,
      topicSignature: true,
      avgCtr: true,
      sampleCount: true,
      avgReviewScore: true,
    },
  });

  const aggregated = new Map<
    string,
    { topicKey: string; topicSignature: string; ctrSum: number; ctrWeight: number; reviewSum: number; reviewCount: number }
  >();

  for (const r of records) {
    const key = `${r.topicKey}\0${r.topicSignature}`;
    const existing = aggregated.get(key);
    const weight = r.sampleCount;
    const ctr = Number(r.avgCtr);

    if (existing) {
      existing.ctrSum += ctr * weight;
      existing.ctrWeight += weight;
      if (r.avgReviewScore != null) {
        existing.reviewSum += Number(r.avgReviewScore) * weight;
        existing.reviewCount += weight;
      }
    } else {
      aggregated.set(key, {
        topicKey: r.topicKey,
        topicSignature: r.topicSignature,
        ctrSum: ctr * weight,
        ctrWeight: weight,
        reviewSum: r.avgReviewScore != null ? Number(r.avgReviewScore) * weight : 0,
        reviewCount: r.avgReviewScore != null ? weight : 0,
      });
    }
  }

  let items: TopicPerformanceItem[] = Array.from(aggregated.values()).map(
    (a) => ({
      topicKey: a.topicKey,
      topicSignature: a.topicSignature,
      avgCtr: a.ctrWeight > 0 ? a.ctrSum / a.ctrWeight : 0,
      sampleCount: a.ctrWeight,
      avgReviewScore:
        a.reviewCount > 0 ? a.reviewSum / a.reviewCount : null,
    })
  );

  const sortKey = sortBy === "avgCtr" ? "avgCtr" : sortBy === "sampleCount" ? "sampleCount" : "avgReviewScore";
  items.sort((a, b) => {
    const aVal = a[sortKey] ?? 0;
    const bVal = b[sortKey] ?? 0;
    return sortOrder === "desc" ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number);
  });

  items = items.slice(offset, offset + limit);

  return {
    items,
    semantics: {
      cohortBy: "job_creation_date",
      reviewScoreScale: "0..1",
      smoothedCtrFormula: "(clicks + 1) / (views + 10)",
      approveRateBase: "jobsCount",
    },
  };
}
