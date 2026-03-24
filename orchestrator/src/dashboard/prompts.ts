import type { PrismaClient } from "@prisma/client";
import { parseArmIdFromAssignment } from "../experiments/assignment-meta.js";

export type PromptPerformanceItem = {
  type: string;
  version: number;
  isActive: boolean;
  jobsCount: number;
  approvedCount: number;
  reviewRequiredCount: number;
  rejectedCount: number;
  approveRate: number | null;
  avgReviewScore: number | null;
  smoothedCtr: number | null;
  experimentUsageCount: number;
};

export type PromptsResult = {
  items: PromptPerformanceItem[];
  semantics: {
    cohortBy: string;
    reviewScoreScale: string;
    smoothedCtrFormula: string;
    approveRateBase: string;
  };
};

export type GetPromptsInput = {
  type?: string;
  days?: number;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

function smoothedCtr(clicks: number, views: number): number {
  return (clicks + 1) / (views + 10);
}

function resolveTimeRange(input: GetPromptsInput): { from: Date; to: Date } {
  const to = input.to ? new Date(input.to) : new Date();
  to.setHours(23, 59, 59, 999);

  let from: Date;
  if (input.from) {
    from = new Date(input.from);
    from.setHours(0, 0, 0, 0);
  } else {
    const days = input.days ?? 14;
    from = new Date(to);
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);
  }

  return { from, to };
}

export async function getPromptPerformance(
  db: PrismaClient,
  input: GetPromptsInput
): Promise<PromptsResult> {
  const { from, to } = resolveTimeRange(input);
  const promptType = input.type ?? "writer";
  const limit = Math.min(input.limit ?? 50, 100);
  const offset = input.offset ?? 0;

  const [jobsWithOutputs, promptVersions, runningExperiments] = await Promise.all([
    db.job.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: {
        id: true,
        decision: true,
        reviewScore: true,
        outputs: {
          select: { promptVersions: true, experimentAssignments: true },
        },
        metrics: {
          select: { views: true, clicks: true, avgReviewScore: true },
        },
      },
    }),
    db.promptVersion.findMany({
      where: { type: promptType },
      select: { version: true, isActive: true },
    }),
    db.experiment.findMany({
      where: { status: "running" },
      select: { id: true, arms: { select: { id: true } } },
    }),
  ]);

  const runningExpIds = new Set(runningExperiments.map((e) => e.id));
  const armIds = new Set(
    runningExperiments.flatMap((e) => e.arms.map((a) => a.id))
  );

  const byVersion = new Map<
    number,
    {
      jobsCount: number;
      approvedCount: number;
      reviewRequiredCount: number;
      rejectedCount: number;
      reviewScoreSum: number;
      reviewScoreCount: number;
      views: number;
      clicks: number;
      experimentUsageCount: number;
    }
  >();

  const activeVersions = new Set(
    promptVersions.filter((p) => p.isActive).map((p) => p.version)
  );

  for (const pv of promptVersions) {
    byVersion.set(pv.version, {
      jobsCount: 0,
      approvedCount: 0,
      reviewRequiredCount: 0,
      rejectedCount: 0,
      reviewScoreSum: 0,
      reviewScoreCount: 0,
      views: 0,
      clicks: 0,
      experimentUsageCount: 0,
    });
  }

  for (const job of jobsWithOutputs) {
    const pv = job.outputs?.promptVersions as Record<string, number> | null | undefined;
    const version = pv?.[promptType];
    if (version == null) continue;

    if (!byVersion.has(version)) {
      byVersion.set(version, {
        jobsCount: 0,
        approvedCount: 0,
        reviewRequiredCount: 0,
        rejectedCount: 0,
        reviewScoreSum: 0,
        reviewScoreCount: 0,
        views: 0,
        clicks: 0,
        experimentUsageCount: 0,
      });
    }
    const entry = byVersion.get(version)!;

    entry.jobsCount += 1;
    if (job.decision === "APPROVED") entry.approvedCount += 1;
    else if (job.decision === "REVIEW_REQUIRED") entry.reviewRequiredCount += 1;
    else if (job.decision === "REJECTED") entry.rejectedCount += 1;

    if (job.reviewScore != null) {
      entry.reviewScoreSum += Number(job.reviewScore);
      entry.reviewScoreCount += 1;
    }

    for (const m of job.metrics) {
      entry.views += m.views;
      entry.clicks += m.clicks;
    }

    const assignments = job.outputs?.experimentAssignments as Record<string, unknown> | null | undefined;
    if (assignments && typeof assignments === "object") {
      for (const expId of Object.keys(assignments)) {
        if (runningExpIds.has(expId)) {
          const val = assignments[expId];
          const aid = parseArmIdFromAssignment(
            val as import("../experiments/assignment-meta.js").ExperimentAssignmentsValue
          );
          if (aid && armIds.has(aid)) {
            entry.experimentUsageCount += 1;
            break;
          }
        }
      }
    }
  }

  const items: PromptPerformanceItem[] = Array.from(byVersion.entries())
    .map(([version, data]) => ({
      type: promptType,
      version,
      isActive: activeVersions.has(version),
      jobsCount: data.jobsCount,
      approvedCount: data.approvedCount,
      reviewRequiredCount: data.reviewRequiredCount,
      rejectedCount: data.rejectedCount,
      approveRate:
        data.jobsCount > 0 ? data.approvedCount / data.jobsCount : null,
      avgReviewScore:
        data.reviewScoreCount > 0
          ? data.reviewScoreSum / data.reviewScoreCount
          : null,
      smoothedCtr:
        data.views > 0 || data.clicks > 0
          ? smoothedCtr(data.clicks, data.views)
          : null,
      experimentUsageCount: data.experimentUsageCount,
    }))
    .filter((i) => i.jobsCount > 0)
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

export async function getPromptVersionsDetail(
  db: PrismaClient,
  input: { type?: string }
): Promise<{
  items: Array<{
    type: string;
    version: number;
    isActive: boolean;
    jobsCount: number;
    approveRate: number | null;
    avgReviewScore: number | null;
    experimentUsageCount: number;
  }>;
  semantics: Record<string, string>;
}> {
  const promptType = input.type ?? "writer";
  const [versions, jobsWithOutputs, runningExperiments] = await Promise.all([
    db.promptVersion.findMany({
      where: { type: promptType },
      select: { version: true, isActive: true },
    }),
    db.job.findMany({
      where: { outputs: { isNot: null } },
      select: {
        decision: true,
        reviewScore: true,
        outputs: {
          select: { promptVersions: true, experimentAssignments: true },
        },
      },
    }),
    db.experiment.findMany({
      where: { status: "running" },
      select: { id: true, arms: { select: { id: true } } },
    }),
  ]);

  const runningExpIds = new Set(runningExperiments.map((e) => e.id));
  const armIds = new Set(
    runningExperiments.flatMap((e) => e.arms.map((a) => a.id))
  );

  const byVersion = new Map<
    number,
    { jobsCount: number; approvedCount: number; reviewScoreSum: number; reviewScoreCount: number; expUsage: number }
  >();

  for (const pv of versions) {
    byVersion.set(pv.version, {
      jobsCount: 0,
      approvedCount: 0,
      reviewScoreSum: 0,
      reviewScoreCount: 0,
      expUsage: 0,
    });
  }

  for (const job of jobsWithOutputs) {
    const pv = job.outputs?.promptVersions as Record<string, number> | null | undefined;
    const version = pv?.[promptType];
    if (version == null || !byVersion.has(version)) continue;

    const entry = byVersion.get(version)!;
    entry.jobsCount += 1;
    if (job.decision === "APPROVED") entry.approvedCount += 1;
    if (job.reviewScore != null) {
      entry.reviewScoreSum += Number(job.reviewScore);
      entry.reviewScoreCount += 1;
    }

    const assignments = job.outputs?.experimentAssignments as Record<string, unknown> | null | undefined;
    if (assignments && typeof assignments === "object") {
      for (const expId of Object.keys(assignments)) {
        if (runningExpIds.has(expId)) {
          const val = assignments[expId];
          const aid = parseArmIdFromAssignment(
            val as import("../experiments/assignment-meta.js").ExperimentAssignmentsValue
          );
          if (aid && armIds.has(aid)) {
            entry.expUsage += 1;
            break;
          }
        }
      }
    }
  }

  const versionMap = new Map(versions.map((v) => [v.version, v.isActive]));

  const items = Array.from(byVersion.entries()).map(([version, data]) => ({
    type: promptType,
    version,
    isActive: versionMap.get(version) ?? false,
    jobsCount: data.jobsCount,
    approveRate:
      data.jobsCount > 0 ? data.approvedCount / data.jobsCount : null,
    avgReviewScore:
      data.reviewScoreCount > 0
        ? data.reviewScoreSum / data.reviewScoreCount
        : null,
    experimentUsageCount: data.expUsage,
  }));

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
