import type { PrismaClient } from "@prisma/client";
import type { Logger } from "pino";
import { parseArmIdFromAssignment } from "../experiments/assignment-meta.js";

function smoothedCtr(clicks: number, views: number): number {
  return (clicks + 1) / (views + 10);
}

export type AggregateExperimentOptions = {
  days?: number;
  experimentIds?: string[];
};

/**
 * Aggregates experiment metrics. Uses job creation date for cohort.
 * Note: views/clicks arrive later (metric recorded date); for lagging metrics
 * consider a separate "performance by metric date" aggregation.
 */
export async function runAggregateExperimentMetrics(
  db: PrismaClient,
  logger: Logger,
  opts: AggregateExperimentOptions = {}
): Promise<{ aggregated: number }> {
  const days = opts.days ?? 7;
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const experiments = opts.experimentIds
    ? await db.experiment.findMany({
        where: { id: { in: opts.experimentIds } },
        include: { arms: true },
      })
    : await db.experiment.findMany({
        where: { status: { in: ["running", "completed"] } },
        include: { arms: true },
      });

  let totalUpserted = 0;

  for (const exp of experiments) {
    const armIds = new Set(exp.arms.map((a) => a.id));

    const outputsWithExp = await db.jobOutput.findMany({
      where: { job: { createdAt: { gte: since } } },
      select: { jobId: true, experimentAssignments: true },
    });

    const jobIdsForExp = outputsWithExp
      .filter((o) => {
        const a = o.experimentAssignments as Record<string, unknown> | null | undefined;
        const val = a != null && typeof a === "object" ? a[exp.id] : undefined;
        const armId = parseArmIdFromAssignment(
          val as import("../experiments/assignment-meta.js").ExperimentAssignmentsValue
        );
        return armId != null && armIds.has(armId);
      })
      .map((o) => o.jobId);

    const jobs = await db.job.findMany({
      where: { id: { in: jobIdsForExp } },
      include: { outputs: true, metrics: true },
    });

    const byArmDate = new Map<
      string,
      {
        jobsCount: number;
        approved: number;
        reviewRequired: number;
        rejected: number;
        impressions: number;
        views: number;
        clicks: number;
        reviewScoreSum: number;
        reviewScoreCount: number;
      }
    >();

    for (const job of jobs) {
      const assign = (job.outputs?.experimentAssignments ?? {}) as Record<string, unknown>;
      const armId = parseArmIdFromAssignment(
        assign[exp.id] as import("../experiments/assignment-meta.js").ExperimentAssignmentsValue
      );
      if (!armId || !armIds.has(armId)) continue;

      const date = new Date(job.createdAt);
      date.setHours(0, 0, 0, 0);
      const key = `${armId}:${date.toISOString().slice(0, 10)}`;

      const bucket = byArmDate.get(key) ?? {
        jobsCount: 0,
        approved: 0,
        reviewRequired: 0,
        rejected: 0,
        impressions: 0,
        views: 0,
        clicks: 0,
        reviewScoreSum: 0,
        reviewScoreCount: 0,
      };

      bucket.jobsCount += 1;
      if (job.decision === "APPROVED") bucket.approved += 1;
      else if (job.decision === "REVIEW_REQUIRED") bucket.reviewRequired += 1;
      else if (job.decision === "REJECTED") bucket.rejected += 1;

      for (const m of job.metrics) {
        bucket.impressions += m.impressions;
        bucket.views += m.views;
        bucket.clicks += m.clicks;
        if (m.avgReviewScore != null) {
          bucket.reviewScoreSum += Number(m.avgReviewScore);
          bucket.reviewScoreCount += 1;
        }
      }
      byArmDate.set(key, bucket);
    }

    for (const [key, data] of byArmDate) {
      const [armId, dateStr] = key.split(":");
      const metricDate = new Date(dateStr);
      const avgReviewScore =
        data.reviewScoreCount > 0
          ? data.reviewScoreSum / data.reviewScoreCount
          : null;
      const smoothed =
        data.views > 0 || data.clicks > 0
          ? smoothedCtr(data.clicks, data.views)
          : null;

      await db.experimentResultsDaily.upsert({
        where: {
          experimentId_armId_metricDate: {
            experimentId: exp.id,
            armId,
            metricDate,
          },
        },
        create: {
          experimentId: exp.id,
          armId,
          metricDate,
          jobsCount: data.jobsCount,
          approvedCount: data.approved,
          reviewRequiredCount: data.reviewRequired,
          rejectedCount: data.rejected,
          impressions: data.impressions,
          views: data.views,
          clicks: data.clicks,
          avgReviewScore: avgReviewScore,
          smoothedCtr: smoothed,
          sampleCount: data.jobsCount,
        },
        update: {
          jobsCount: data.jobsCount,
          approvedCount: data.approved,
          reviewRequiredCount: data.reviewRequired,
          rejectedCount: data.rejected,
          impressions: data.impressions,
          views: data.views,
          clicks: data.clicks,
          avgReviewScore: avgReviewScore,
          smoothedCtr: smoothed,
          sampleCount: data.jobsCount,
        },
      });
      totalUpserted += 1;
    }
  }

  logger.info(
    { aggregated: totalUpserted, experiments: experiments.length, days },
    "Experiment metrics aggregation completed"
  );
  return { aggregated: totalUpserted };
}
