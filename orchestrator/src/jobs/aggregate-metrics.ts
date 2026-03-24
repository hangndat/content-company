import type { PrismaClient } from "@prisma/client";
import type { Logger } from "pino";
import { createDailyTopicMetricRepo } from "../repos/daily-topic-metric.js";

/**
 * Aggregate raw ContentMetric → DailyTopicMetric. Idempotent: upsert by
 * (topic_key, topic_signature, metric_date). Safe to rerun for same day(s).
 */
/** Smoothed CTR: (clicks + 1) / (views + 10) */
function smoothedCtr(clicks: number, views: number): number {
  return (clicks + 1) / (views + 10);
}

export type AggregateMetricsOptions = {
  /** Number of days to aggregate (default 7) */
  days?: number;
};

export async function runAggregateMetrics(
  db: PrismaClient,
  logger: Logger,
  opts: AggregateMetricsOptions = {}
): Promise<{ aggregated: number }> {
  const days = opts.days ?? 7;
  const repo = createDailyTopicMetricRepo(db);

  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const metrics = await db.contentMetric.findMany({
    where: { recordedAt: { gte: since } },
    select: {
      topicKey: true,
      topicSignature: true,
      views: true,
      clicks: true,
      avgReviewScore: true,
      recordedAt: true,
    },
  });

  const byBucket = new Map<
    string,
    { views: number; clicks: number; reviewScores: number[]; count: number }
  >();

  for (const m of metrics) {
    const key = m.topicKey ?? "unknown";
    const sig = m.topicSignature ?? "";
    const date = new Date(m.recordedAt);
    date.setHours(0, 0, 0, 0);
    const bucket = `${key}\0${sig}\0${date.toISOString().slice(0, 10)}`;

    const existing = byBucket.get(bucket) ?? {
      views: 0,
      clicks: 0,
      reviewScores: [],
      count: 0,
    };
    existing.views += m.views;
    existing.clicks += m.clicks;
    existing.count += 1;
    if (m.avgReviewScore != null) {
      existing.reviewScores.push(Number(m.avgReviewScore));
    }
    byBucket.set(bucket, existing);
  }

  let aggregated = 0;
  for (const [bucket, data] of byBucket) {
    const [topicKey, topicSignature, dateStr] = bucket.split("\0");
    const date = new Date(dateStr);
    const avgCtr = smoothedCtr(data.clicks, data.views);
    const avgReviewScore =
      data.reviewScores.length > 0
        ? data.reviewScores.reduce((a, b) => a + b, 0) / data.reviewScores.length
        : null;

    await repo.upsert({
      topicKey,
      topicSignature,
      metricDate: date,
      avgCtr,
      sampleCount: data.count,
      avgReviewScore,
    });
    aggregated++;
  }

  logger.info({ aggregated, days, buckets: byBucket.size }, "Metrics aggregation completed");
  return { aggregated };
}
