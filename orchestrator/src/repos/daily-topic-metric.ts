import type { PrismaClient } from "@prisma/client";

export type DailyTopicMetricRow = {
  topicKey: string;
  topicSignature: string;
  metricDate: Date;
  avgCtr: number;
  sampleCount: number;
  avgReviewScore: number | null;
};

export type HistoricalFeedback = {
  avgCtr: number;
  sampleCount: number;
  confidence: "none" | "light" | "full";
  promptNote: string;
};

const CONFIDENCE_THRESHOLDS = { light: 3, full: 10 } as const;

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

export function createDailyTopicMetricRepo(db: PrismaClient) {
  return {
    /** Idempotent upsert by (topicKey, topicSignature, metricDate). Rerun-safe. */
    async upsert(row: DailyTopicMetricRow) {
      return db.dailyTopicMetric.upsert({
        where: {
          topicKey_topicSignature_metricDate: {
            topicKey: row.topicKey,
            topicSignature: row.topicSignature || "",
            metricDate: row.metricDate,
          },
        },
        create: {
          topicKey: row.topicKey,
          topicSignature: row.topicSignature || "",
          metricDate: row.metricDate,
          avgCtr: row.avgCtr,
          sampleCount: row.sampleCount,
          avgReviewScore: row.avgReviewScore,
        },
        update: {
          avgCtr: row.avgCtr,
          sampleCount: row.sampleCount,
          avgReviewScore: row.avgReviewScore,
        },
      });
    },

    async getHistoricalFeedback(
      topicKey: string,
      topicSignature: string,
      lookbackDays = 30
    ): Promise<HistoricalFeedback> {
      const since = new Date();
      since.setDate(since.getDate() - lookbackDays);
      since.setHours(0, 0, 0, 0);

      const bySignature = await db.dailyTopicMetric.findMany({
        where: {
          topicSignature: topicSignature || "",
          metricDate: { gte: since },
        },
        orderBy: { metricDate: "desc" },
        take: lookbackDays,
      });

      if (bySignature.length > 0) {
        const totalWeight = bySignature.reduce((s, r) => s + r.sampleCount, 0);
        const weightedCtr =
          totalWeight > 0
            ? bySignature.reduce((s, r) => s + Number(r.avgCtr) * r.sampleCount, 0) / totalWeight
            : 0;
        const sampleCount = bySignature.reduce((s, r) => s + r.sampleCount, 0);
        const conf =
          sampleCount >= CONFIDENCE_THRESHOLDS.full
            ? "full"
            : sampleCount >= CONFIDENCE_THRESHOLDS.light
              ? "light"
              : "none";
        return {
          avgCtr: weightedCtr,
          sampleCount,
          confidence: conf,
          promptNote: formatFeedbackNote(weightedCtr, sampleCount, conf),
        };
      }

      const byKeyPrefix = await db.dailyTopicMetric.findMany({
        where: {
          topicKey: { startsWith: topicKey.slice(0, 20) },
          metricDate: { gte: since },
        },
        orderBy: { metricDate: "desc" },
        take: lookbackDays,
      });

      if (byKeyPrefix.length === 0) {
        return { avgCtr: 0, sampleCount: 0, confidence: "none", promptNote: "" };
      }

      const totalWeight = byKeyPrefix.reduce((s, r) => s + r.sampleCount, 0);
      const weightedCtr =
        totalWeight > 0
          ? byKeyPrefix.reduce((s, r) => s + Number(r.avgCtr) * r.sampleCount, 0) / totalWeight
          : 0;
      const sampleCount = byKeyPrefix.reduce((s, r) => s + r.sampleCount, 0);
      const conf =
        sampleCount >= CONFIDENCE_THRESHOLDS.full
          ? "full"
          : sampleCount >= CONFIDENCE_THRESHOLDS.light
            ? "light"
            : "none";
      return {
        avgCtr: weightedCtr,
        sampleCount,
        confidence: conf,
        promptNote: formatFeedbackNote(weightedCtr, sampleCount, conf),
      };
    },
  };
}
