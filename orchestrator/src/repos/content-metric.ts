import type { PrismaClient } from "@prisma/client";

export type UpsertMetricInput = {
  jobId: string;
  channelId: string;
  topicKey?: string;
  topicLabel?: string;
  topicSignature?: string;
  impressions?: number;
  views?: number;
  clicks?: number;
  avgReviewScore?: number;
};

export type HistoricalFeedback = {
  avgCtr: number;
  sampleCount: number;
  confidence: "none" | "light" | "full";
  promptNote: string;
};

const CONFIDENCE_THRESHOLDS = { light: 3, full: 10 } as const;

/** Smoothed CTR: (clicks + 1) / (views + 10) to avoid 1/1 = 100% bias */
function smoothedCtr(clicks: number, views: number): number {
  return (clicks + 1) / (views + 10);
}

function computeAvgCtr(metrics: { views: number; clicks: number }[]): { avgCtr: number; sampleCount: number } {
  let totalCtr = 0;
  let count = 0;
  for (const m of metrics) {
    totalCtr += smoothedCtr(m.clicks, m.views);
    count++;
  }
  return { avgCtr: count > 0 ? totalCtr / count : 0, sampleCount: count };
}

function formatFeedbackNote(avgCtr: number, sampleCount: number, confidence: "none" | "light" | "full"): string {
  if (sampleCount === 0) return "";
  const ctrPct = (avgCtr * 100).toFixed(2);
  if (confidence === "none") {
    return `[For reference only - limited data] Similar topics: avg CTR ${ctrPct}% (${sampleCount} samples). Consider but do not over-weight.`;
  }
  if (confidence === "light") {
    return `[Light signal] Historical: avg CTR ${ctrPct}% (${sampleCount} samples). Slightly favor topics with better CTR.`;
  }
  return `Historical performance for similar topics: avg CTR ${ctrPct}% (${sampleCount} samples). Favor topics with better historical CTR.`;
}

export function createContentMetricRepo(db: PrismaClient) {
  return {
    async upsert(input: UpsertMetricInput) {
      return db.contentMetric.upsert({
        where: {
          jobId_channelId: { jobId: input.jobId, channelId: input.channelId },
        },
        create: {
          jobId: input.jobId,
          channelId: input.channelId,
          topicKey: input.topicKey,
          topicLabel: input.topicLabel,
          topicSignature: input.topicSignature,
          impressions: input.impressions ?? 0,
          views: input.views ?? 0,
          clicks: input.clicks ?? 0,
          avgReviewScore: input.avgReviewScore,
        },
        update: {
          ...(input.topicKey != null && { topicKey: input.topicKey }),
          ...(input.topicLabel != null && { topicLabel: input.topicLabel }),
          ...(input.topicSignature != null && { topicSignature: input.topicSignature }),
          ...(input.impressions != null && { impressions: input.impressions }),
          ...(input.views != null && { views: input.views }),
          ...(input.clicks != null && { clicks: input.clicks }),
          ...(input.avgReviewScore != null && { avgReviewScore: input.avgReviewScore }),
        },
      });
    },

    async getHistoricalFeedback(
      topicKey: string,
      topicSignature: string,
      limit = 30
    ): Promise<HistoricalFeedback> {
      const bySignature = await db.contentMetric.findMany({
        where: { topicSignature },
        take: limit,
        orderBy: { recordedAt: "desc" },
      });

      if (bySignature.length > 0) {
        const { avgCtr, sampleCount } = computeAvgCtr(bySignature);
        const conf = sampleCount >= CONFIDENCE_THRESHOLDS.full ? "full" : sampleCount >= CONFIDENCE_THRESHOLDS.light ? "light" : "none";
        return {
          avgCtr,
          sampleCount,
          confidence: conf,
          promptNote: formatFeedbackNote(avgCtr, sampleCount, conf),
        };
      }

      const byKeyPrefix = await db.contentMetric.findMany({
        where: { topicKey: { startsWith: topicKey.slice(0, 20) } },
        take: limit,
        orderBy: { recordedAt: "desc" },
      });

      if (byKeyPrefix.length === 0) {
        return { avgCtr: 0, sampleCount: 0, confidence: "none", promptNote: "" };
      }

      const { avgCtr, sampleCount } = computeAvgCtr(byKeyPrefix);
      const conf = sampleCount >= CONFIDENCE_THRESHOLDS.full ? "full" : sampleCount >= CONFIDENCE_THRESHOLDS.light ? "light" : "none";
      return {
        avgCtr,
        sampleCount,
        confidence: conf,
        promptNote: formatFeedbackNote(avgCtr, sampleCount, conf),
      };
    },

    async getAvgCtrByTopicKey(topicKey: string, limit = 20): Promise<{ avgCtr: number; sampleCount: number }> {
      const metrics = await db.contentMetric.findMany({
        where: { topicKey },
        take: limit,
        orderBy: { recordedAt: "desc" },
      });
      return computeAvgCtr(metrics);
    },

    async getAvgCtrByTopicPrefix(
      topicKeyPrefix: string,
      limit = 20
    ): Promise<{ avgCtr: number; sampleCount: number }> {
      const metrics = await db.contentMetric.findMany({
        where: { topicKey: { startsWith: topicKeyPrefix } },
        take: limit,
        orderBy: { recordedAt: "desc" },
      });
      return computeAvgCtr(metrics);
    },
  };
}
