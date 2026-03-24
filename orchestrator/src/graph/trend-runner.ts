import type { GraphState } from "./types.js";
import { DEFAULT_TREND_DOMAIN } from "../trends/domain-profiles.js";
import type { RunTrendJobBody } from "../api/schemas.js";
import { normalize } from "./nodes/normalize.js";
import { aggregateTrendsAsync } from "./nodes/aggregate.js";
import { embedRefineTrends } from "./nodes/embed-refine-trends.js";
import { createJobRepo } from "../repos/job.js";
import { createJobSnapshotRepo } from "../repos/job-snapshot.js";
import { JOB_STATUS } from "../config/constants.js";
import type { TrendCandidate } from "../trends/trend-candidate.js";
import { runStepsWithSnapshots } from "./run-steps-with-snapshots.js";

const STEPS = ["normalize", "aggregate", "embedRefine"] as const;

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

type TrendGraphState = GraphState & { trendCandidates?: TrendCandidate[] };

function stateToJson(state: TrendGraphState): object {
  return {
    jobId: state.jobId,
    traceId: state.traceId,
    sourceType: state.sourceType,
    trendDomain: state.trendDomain,
    rawItems: state.rawItems,
    channel: state.channel,
    normalizedItems: state.normalizedItems,
    trendCandidates: state.trendCandidates,
  };
}

export async function runTrendGraph(
  input: RunTrendGraphInput,
  deps: RunTrendGraphDeps
): Promise<void> {
  const { db, logger, env } = deps;
  const jobRepo = createJobRepo(db);
  const snapshotRepo = createJobSnapshotRepo(db);

  const job = await jobRepo.findById(input.jobId);
  const retryCount = job?.retryCount ?? 0;

  let state: TrendGraphState = {
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
    state = await runStepsWithSnapshots({
      jobId: input.jobId,
      logger,
      logLabel: "Trend graph step",
      steps: STEPS,
      initialState: state,
      onStep: async (step, prev) => {
        let delta: Partial<TrendGraphState> = {};

        switch (step) {
          case "normalize":
            delta = normalize(prev);
            if ((delta as { decision?: string }).decision === "REJECTED") {
              delta = { ...delta, trendCandidates: [] };
            }
            break;
          case "aggregate":
            delta = await aggregateTrendsAsync(prev, { env, logger });
            break;
          case "embedRefine":
            delta = await embedRefineTrends(prev, { logger, env });
            break;
        }

        const next = { ...prev, ...delta };
        return { next };
      },
      persistSnapshot: async (step, s) => {
        await snapshotRepo.create({
          jobId: input.jobId,
          step,
          stateJson: stateToJson(s),
        });
      },
    });

    await jobRepo.upsertOutput({
      jobId: input.jobId,
      trendCandidates: state.trendCandidates ?? [],
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
