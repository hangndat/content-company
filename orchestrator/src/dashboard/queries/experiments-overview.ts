import type { PrismaClient } from "@prisma/client";

export type ExperimentOverviewItem = {
  id: string;
  name: string;
  nodeType: string;
  scope: string;
  scopeValue: string | null;
  status: string;
  armsCount: number;
  startedAt: string;
  winnerSuggestion: {
    armId: string;
    name: string;
    guards: { minSample: number; maxApproveRateDrop: number; maxReviewScoreDrop: number };
  } | null;
  sampleSufficient: boolean;
};

export type ExperimentsOverviewResult = {
  items: ExperimentOverviewItem[];
  semantics: {
    cohortBy: string;
    reviewScoreScale: string;
    smoothedCtrFormula: string;
    approveRateBase: string;
  };
};

export type GetExperimentsOverviewInput = {
  status?: string;
  nodeType?: string;
  scope?: string;
};

const MIN_SAMPLE = 10;
const MAX_APPROVE_RATE_DROP = 0.05;
const MAX_REVIEW_SCORE_DROP = 0.03;

export async function getExperimentsOverview(
  db: PrismaClient,
  input: GetExperimentsOverviewInput
): Promise<ExperimentsOverviewResult> {
  const where: { status?: string; nodeType?: string; scope?: string } = {};
  if (input.status) where.status = input.status;
  if (input.nodeType) where.nodeType = input.nodeType;
  if (input.scope) where.scope = input.scope;

  const experiments = await db.experiment.findMany({
    where,
    include: { arms: true },
    orderBy: { createdAt: "desc" },
  });

  const since = new Date();
  since.setDate(since.getDate() - 30);
  since.setHours(0, 0, 0, 0);

  const results = await db.experimentResultsDaily.findMany({
    where: {
      experimentId: { in: experiments.map((e) => e.id) },
      metricDate: { gte: since },
    },
    include: { arm: true },
  });

  const byArm = new Map<
    string,
    {
      armId: string;
      name: string;
      jobsCount: number;
      approvedCount: number;
      reviewRequiredCount: number;
      rejectedCount: number;
      impressions: number;
      views: number;
      clicks: number;
      sampleCount: number;
      reviewScoreSum: number;
      reviewScoreCount: number;
    }
  >();

  const expByArm = new Map<string, string>();

  for (const r of results) {
    expByArm.set(r.armId, r.experimentId);
    const existing = byArm.get(r.armId) ?? {
      armId: r.armId,
      name: r.arm.name,
      jobsCount: 0,
      approvedCount: 0,
      reviewRequiredCount: 0,
      rejectedCount: 0,
      impressions: 0,
      views: 0,
      clicks: 0,
      sampleCount: 0,
      reviewScoreSum: 0,
      reviewScoreCount: 0,
    };
    existing.jobsCount += r.jobsCount;
    existing.approvedCount += r.approvedCount;
    existing.reviewRequiredCount += r.reviewRequiredCount;
    existing.rejectedCount += r.rejectedCount;
    existing.impressions += r.impressions;
    existing.views += r.views;
    existing.clicks += r.clicks;
    existing.sampleCount += r.sampleCount;
    if (r.avgReviewScore != null && r.sampleCount > 0) {
      existing.reviewScoreSum += Number(r.avgReviewScore) * r.sampleCount;
      existing.reviewScoreCount += r.sampleCount;
    }
    byArm.set(r.armId, existing);
  }

  const items: ExperimentOverviewItem[] = experiments.map((exp) => {
    const armIds = exp.arms.map((a) => a.id);
    const arms = armIds
      .map((aid) => byArm.get(aid))
      .filter(Boolean) as Array<{
      armId: string;
      name: string;
      jobsCount: number;
      approvedCount: number;
      reviewRequiredCount: number;
      rejectedCount: number;
      impressions: number;
      views: number;
      clicks: number;
      sampleCount: number;
      reviewScoreSum: number;
      reviewScoreCount: number;
    }>;

    const armData = arms.map((a) => {
      const avgReviewScore =
        a.reviewScoreCount > 0 ? a.reviewScoreSum / a.reviewScoreCount : null;
      const smoothedCtr =
        a.views > 0 || a.clicks > 0
          ? (a.clicks + 1) / (a.views + 10)
          : null;
      const approveRate = a.jobsCount ? a.approvedCount / a.jobsCount : 0;
      return { ...a, avgReviewScore, smoothedCtr, approveRate };
    });

    const control =
      armData.find((a) => a.name.toLowerCase() === "control") ??
      armData[0] ??
      null;
    const controlApproveRate = control?.approveRate ?? 0;
    const controlReviewScore =
      control?.avgReviewScore != null ? control.avgReviewScore : 0;

    const eligible = armData.filter((a) => {
      if (a.sampleCount < MIN_SAMPLE) return false;
      const approveDrop = controlApproveRate - a.approveRate;
      const reviewDrop =
        (controlReviewScore ?? 0) - (a.avgReviewScore ?? 0);
      return (
        approveDrop <= MAX_APPROVE_RATE_DROP &&
        reviewDrop <= MAX_REVIEW_SCORE_DROP
      );
    });

    const winner =
      eligible.length > 0
        ? eligible.reduce((best, cur) =>
            (cur.smoothedCtr ?? 0) > (best.smoothedCtr ?? 0) ? cur : best
          )
        : null;

    const firstResult = results.find((r) => r.experimentId === exp.id);
    const startedAt = firstResult
      ? firstResult.metricDate.toISOString().slice(0, 10)
      : exp.createdAt.toISOString().slice(0, 10);

    const sampleSufficient = armData.some((a) => a.sampleCount >= MIN_SAMPLE);

    return {
      id: exp.id,
      name: exp.name,
      nodeType: exp.nodeType,
      scope: exp.scope,
      scopeValue: exp.scopeValue,
      status: exp.status,
      armsCount: exp.arms.length,
      startedAt,
      winnerSuggestion:
        winner != null
          ? {
              armId: winner.armId,
              name: winner.name,
              guards: {
                minSample: MIN_SAMPLE,
                maxApproveRateDrop: MAX_APPROVE_RATE_DROP,
                maxReviewScoreDrop: MAX_REVIEW_SCORE_DROP,
              },
            }
          : null,
      sampleSufficient,
    };
  });

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
