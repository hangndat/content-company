import type { Experiment, ExperimentArm, ExperimentResultsDaily } from "@prisma/client";

type ExperimentWithArms = Experiment & { arms: ExperimentArm[] };

type DailyRow = ExperimentResultsDaily & { arm: ExperimentArm };

export function buildExperimentReport(
  experimentId: string,
  exp: ExperimentWithArms,
  results: DailyRow[]
) {
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

  for (const r of results) {
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

  const minSample = 10;
  const maxApproveRateDrop = 0.05;
  const maxReviewScoreDrop = 0.03;

  const arms = Array.from(byArm.values()).map((e) => {
    const avgReviewScore =
      e.reviewScoreCount > 0 ? e.reviewScoreSum / e.reviewScoreCount : null;
    const smoothedCtr =
      e.views > 0 || e.clicks > 0 ? (e.clicks + 1) / (e.views + 10) : null;
    const approveRate = e.jobsCount ? e.approvedCount / e.jobsCount : null;
    const expArm = exp.arms.find((a) => a.id === e.armId);
    return {
      armId: e.armId,
      name: e.name,
      promptType: expArm?.promptType ?? null,
      promptVersion: expArm?.promptVersion ?? null,
      jobsCount: e.jobsCount,
      approvedCount: e.approvedCount,
      reviewRequiredCount: e.reviewRequiredCount,
      rejectedCount: e.rejectedCount,
      approveRate,
      impressions: e.impressions,
      views: e.views,
      clicks: e.clicks,
      sampleCount: e.sampleCount,
      avgReviewScore,
      smoothedCtr,
    };
  });

  const control =
    arms.find((a) => a.name.toLowerCase() === "control") ??
    (exp.arms[0] ? arms.find((a) => a.armId === exp.arms[0].id) ?? arms[0] : null) ??
    null;
  const controlApproveRate = control?.approveRate ?? 0;
  const controlReviewScore =
    control?.avgReviewScore != null ? Number(control.avgReviewScore) : 0;

  const armsWithGuards = arms.map((a) => {
    const approveRate = a.jobsCount ? a.approvedCount / a.jobsCount : 0;
    const reviewScore = a.avgReviewScore != null ? Number(a.avgReviewScore) : 0;
    const approveDrop = controlApproveRate - approveRate;
    const reviewDrop = controlReviewScore - reviewScore;
    const guardResults = {
      passesSample: a.sampleCount >= minSample,
      passesApproveRate: approveDrop <= maxApproveRateDrop,
      passesReviewScore: reviewDrop <= maxReviewScoreDrop,
    };
    return { ...a, guardResults };
  });

  const eligible = armsWithGuards.filter((a) => {
    if (a.sampleCount < minSample) return false;
    const approveRate = a.jobsCount ? a.approvedCount / a.jobsCount : 0;
    const reviewScore = a.avgReviewScore != null ? Number(a.avgReviewScore) : 0;
    const approveDrop = controlApproveRate - approveRate;
    const reviewDrop = controlReviewScore - reviewScore;
    return approveDrop <= maxApproveRateDrop && reviewDrop <= maxReviewScoreDrop;
  });

  const winner =
    eligible.length > 0
      ? eligible.reduce((best, cur) =>
          (cur.smoothedCtr ?? 0) > (best.smoothedCtr ?? 0) ? cur : best
        )
      : null;

  return {
    experimentId,
    avgReviewScoreScale: "0..1",
    controlArm: control ? { armId: control.armId, name: control.name } : null,
    arms: armsWithGuards,
    cohortBy: "job_creation_date",
    note: "Metrics grouped by job creation date. Views/clicks may arrive later (recorded date); consider separate performance-by-metric-date report for lagging metrics.",
    winnerSuggestion:
      winner != null
        ? {
            armId: winner.armId,
            name: winner.name,
            metric: "smoothedCtr",
            guards: {
              minSample,
              maxApproveRateDrop,
              maxReviewScoreDrop,
              avgReviewScoreScale: "0..1",
            },
          }
        : null,
    minSampleForWinner: minSample,
  };
}
