import type { GraphState } from "./types.js";
import { DEFAULT_TREND_DOMAIN } from "../trends/domain-profiles.js";
import type { RunTrendJobBody } from "../api/schemas.js";
import { normalize } from "./nodes/normalize.js";
import { aggregate } from "./nodes/aggregate.js";
import { createJobRepo } from "../repos/job.js";
import { createJobSnapshotRepo } from "../repos/job-snapshot.js";
import { JOB_STATUS } from "../config/constants.js";

const STEPS = ["normalize", "aggregate"] as const;

export type RunTrendGraphInput = RunTrendJobBody & {
  jobId: string;
  traceId: string;
};

export type RunTrendGraphDeps = {
  db: import("@prisma/client").PrismaClient;
  redis: import("ioredis").Redis;
  logger: import("pino").Logger;
  env: import("../config/env.js").Env;
};

function stateToJson(state: GraphState & { trendCandidates?: unknown[] }): object {
  return {
    jobId: state.jobId,
    traceId: state.traceId,
    sourceType: state.sourceType,
    trendDomain: state.trendDomain,
    rawItems: state.rawItems,
    channel: state.channel,
    normalizedItems: state.normalizedItems,
    trendCandidates: (state as { trendCandidates?: unknown[] }).trendCandidates,
  };
}

export async function runTrendGraph(
  input: RunTrendGraphInput,
  deps: RunTrendGraphDeps
): Promise<void> {
  const { db, logger } = deps;
  const jobRepo = createJobRepo(db);
  const snapshotRepo = createJobSnapshotRepo(db);

  const job = await jobRepo.findById(input.jobId);
  const retryCount = job?.retryCount ?? 0;

  let state: GraphState & { trendCandidates?: unknown[] } = {
    jobId: input.jobId,
    traceId: input.traceId,
    sourceType: "trend_aggregate",
    trendDomain: input.domain ?? DEFAULT_TREND_DOMAIN,
    rawItems: input.rawItems,
    publishPolicy: "auto",
    channel: input.channel ?? { id: "blog-1", type: "blog", metadata: {} },
    normalizedItems: [],
    retryCount,
  };

  try {
    for (const step of STEPS) {
      logger.info({ jobId: input.jobId, step }, "Trend graph step");
      let delta: Partial<GraphState & { trendCandidates?: unknown[] }> = {};

      switch (step) {
        case "normalize":
          delta = normalize(state);
          if ((delta as { decision?: string }).decision === "REJECTED") {
            delta = { ...delta, trendCandidates: [] };
          }
          break;
        case "aggregate":
          delta = aggregate(state);
          break;
      }

      state = { ...state, ...delta };

      await snapshotRepo.create({
        jobId: input.jobId,
        step,
        stateJson: stateToJson(state),
      });
    }

    await jobRepo.upsertOutput({
      jobId: input.jobId,
      trendCandidates: (state.trendCandidates ?? []) as import("../repos/job.js").TrendCandidate[],
    });
    await jobRepo.updateStatus(input.jobId, {
      status: JOB_STATUS.COMPLETED,
      completedAt: new Date(),
    });

    logger.info(
      { jobId: input.jobId, candidatesCount: (state.trendCandidates ?? []).length },
      "Trend graph completed"
    );
  } catch (err) {
    logger.error({ err, jobId: input.jobId }, "Trend graph failed");
    await jobRepo.updateStatus(input.jobId, {
      status: JOB_STATUS.FAILED,
      completedAt: new Date(),
    });
    throw err;
  }
}
