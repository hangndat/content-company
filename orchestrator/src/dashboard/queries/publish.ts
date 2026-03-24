import type { PrismaClient } from "@prisma/client";

export type PublishByDay = {
  date: string;
  success: number;
  failed: number;
};

export type PublishByChannel = {
  channelId: string;
  success: number;
  failed: number;
};

export type PublishMetricsResult = {
  byDay: PublishByDay[];
  byChannel: PublishByChannel[];
  total: { success: number; failed: number };
  semantics: {
    cohortBy: string;
    reviewScoreScale: string;
    smoothedCtrFormula: string;
    approveRateBase: string;
  };
};

export type GetPublishMetricsInput = {
  days?: number;
  from?: string;
  to?: string;
};

function resolveTimeRange(input: GetPublishMetricsInput): { from: Date; to: Date } {
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

export async function getPublishMetrics(
  db: PrismaClient,
  input: GetPublishMetricsInput
): Promise<PublishMetricsResult> {
  const { from, to } = resolveTimeRange(input);

  const records = await db.publishedContent.findMany({
    where: { createdAt: { gte: from, lte: to } },
    select: {
      createdAt: true,
      channelId: true,
      status: true,
    },
  });

  const byDayMap = new Map<string, { success: number; failed: number }>();
  const byChannelMap = new Map<string, { success: number; failed: number }>();

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const r of records) {
    const dateStr = r.createdAt.toISOString().slice(0, 10);
    const isSuccess = r.status === "published";

    if (isSuccess) {
      totalSuccess += 1;
    } else {
      totalFailed += 1;
    }

    const dayEntry = byDayMap.get(dateStr) ?? { success: 0, failed: 0 };
    if (isSuccess) dayEntry.success += 1;
    else dayEntry.failed += 1;
    byDayMap.set(dateStr, dayEntry);

    const chEntry = byChannelMap.get(r.channelId) ?? { success: 0, failed: 0 };
    if (isSuccess) chEntry.success += 1;
    else chEntry.failed += 1;
    byChannelMap.set(r.channelId, chEntry);
  }

  const byDay = Array.from(byDayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ date, ...data }));

  const byChannel = Array.from(byChannelMap.entries()).map(
    ([channelId, data]) => ({
      channelId,
      ...data,
    })
  );

  return {
    byDay,
    byChannel,
    total: { success: totalSuccess, failed: totalFailed },
    semantics: {
      cohortBy: "job_creation_date",
      reviewScoreScale: "0..1",
      smoothedCtrFormula: "(clicks + 1) / (views + 10)",
      approveRateBase: "jobsCount",
    },
  };
}
