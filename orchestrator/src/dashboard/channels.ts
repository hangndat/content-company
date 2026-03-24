import type { PrismaClient } from "@prisma/client";

export type ChannelPerformanceItem = {
  channelId: string;
  jobsCount: number;
  approvedCount: number;
  publishSuccess: number;
  publishFailed: number;
  impressions: number;
  views: number;
  clicks: number;
  smoothedCtr: number | null;
};

export type ChannelsResult = {
  items: ChannelPerformanceItem[];
  semantics: {
    cohortBy: string;
    reviewScoreScale: string;
    smoothedCtrFormula: string;
    approveRateBase: string;
  };
};

export type GetChannelsInput = {
  days?: number;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

function smoothedCtr(clicks: number, views: number): number {
  return (clicks + 1) / (views + 10);
}

function resolveTimeRange(input: GetChannelsInput): { from: Date; to: Date } {
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

export async function getChannelPerformance(
  db: PrismaClient,
  input: GetChannelsInput
): Promise<ChannelsResult> {
  const { from, to } = resolveTimeRange(input);
  const limit = Math.min(input.limit ?? 50, 100);
  const offset = input.offset ?? 0;

  const [metrics, published] = await Promise.all([
    db.contentMetric.findMany({
      where: { recordedAt: { gte: from, lte: to } },
      select: {
        jobId: true,
        channelId: true,
        impressions: true,
        views: true,
        clicks: true,
      },
    }),
    db.publishedContent.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: { channelId: true, status: true },
    }),
  ]);

  const channelIds = new Set<string>();
  for (const m of metrics) channelIds.add(m.channelId);
  for (const p of published) channelIds.add(p.channelId);

  const byChannel = new Map<
    string,
    {
      jobIds: Set<string>;
      approvedJobIds: Set<string>;
      publishSuccess: number;
      publishFailed: number;
      impressions: number;
      views: number;
      clicks: number;
    }
  >();

  for (const chId of channelIds) {
    byChannel.set(chId, {
      jobIds: new Set(),
      approvedJobIds: new Set(),
      publishSuccess: 0,
      publishFailed: 0,
      impressions: 0,
      views: 0,
      clicks: 0,
    });
  }

  for (const m of metrics) {
    const entry = byChannel.get(m.channelId)!;
    entry.impressions += m.impressions;
    entry.views += m.views;
    entry.clicks += m.clicks;
    entry.jobIds.add(m.jobId);
  }

  for (const p of published) {
    const entry = byChannel.get(p.channelId)!;
    if (p.status === "published") {
      entry.publishSuccess += 1;
    } else {
      entry.publishFailed += 1;
    }
  }

  const jobIds = [...new Set(metrics.map((m) => m.jobId))];
  const jobs =
    jobIds.length > 0
      ? await db.job.findMany({
          where: { id: { in: jobIds } },
          select: { id: true, decision: true },
        })
      : [];
  const jobDecisionMap = Object.fromEntries(jobs.map((j) => [j.id, j.decision]));

  for (const m of metrics) {
    const entry = byChannel.get(m.channelId)!;
    entry.jobIds.add(m.jobId);
    if (jobDecisionMap[m.jobId] === "APPROVED") {
      entry.approvedJobIds.add(m.jobId);
    }
  }

  let items: ChannelPerformanceItem[] = Array.from(byChannel.entries()).map(
    ([channelId, data]) => ({
      channelId,
      jobsCount: data.jobIds.size,
      approvedCount: data.approvedJobIds.size,
      publishSuccess: data.publishSuccess,
      publishFailed: data.publishFailed,
      impressions: data.impressions,
      views: data.views,
      clicks: data.clicks,
      smoothedCtr:
        data.views > 0 || data.clicks > 0
          ? smoothedCtr(data.clicks, data.views)
          : null,
    })
  );

  items = items
    .filter((i) => i.jobsCount > 0 || i.publishSuccess > 0 || i.views > 0)
    .sort((a, b) => b.jobsCount - a.jobsCount)
    .slice(offset, offset + limit);

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
