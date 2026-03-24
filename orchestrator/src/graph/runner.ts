import type { GraphState, GraphContext } from "./types.js";
import type { RunJobBody } from "../api/schemas.js";
import { normalize } from "./nodes/normalize.js";
import { planner } from "./nodes/planner.js";
import { scorer } from "./nodes/scorer.js";
import { writer } from "./nodes/writer.js";
import { reviewer } from "./nodes/reviewer.js";
import { decisionNode } from "./nodes/decision.js";
import { createJobRepo } from "../repos/job.js";
import { createContentVersionRepo } from "../repos/content-version.js";
import { createJobSnapshotRepo } from "../repos/job-snapshot.js";
import { JOB_STATUS, DECISION } from "../config/constants.js";

const STEPS = ["normalize", "planner", "scorer", "writer", "reviewer", "decision"] as const;

export type RunGraphInput = RunJobBody & {
  jobId: string;
  traceId: string;
};

export type RunGraphDeps = {
  db: import("@prisma/client").PrismaClient;
  redis: import("ioredis").Redis;
  logger: import("pino").Logger;
  env: import("../config/env.js").Env;
};

function stateToJson(state: GraphState): object {
  return {
    jobId: state.jobId,
    traceId: state.traceId,
    sourceType: state.sourceType,
    topicHint: state.topicHint,
    rawItems: state.rawItems,
    publishPolicy: state.publishPolicy,
    channel: state.channel,
    normalizedItems: state.normalizedItems,
    outline: state.outline,
    topicScore: state.topicScore,
    draft: state.draft,
    reviewScore: state.reviewScore,
    reviewNotes: state.reviewNotes,
    riskFlag: state.riskFlag,
    decision: state.decision,
    retryCount: state.retryCount,
    promptVersions: state.promptVersions,
    experimentAssignments: state.experimentAssignments,
  };
}

export async function runGraph(
  input: RunGraphInput,
  deps: RunGraphDeps,
  fromStep?: string
): Promise<void> {
  const { db, logger } = deps;
  const jobRepo = createJobRepo(db);
  const contentVersionRepo = createContentVersionRepo(db);
  const snapshotRepo = createJobSnapshotRepo(db);

  const job = await jobRepo.findById(input.jobId);
  const retryCount = job?.retryCount ?? 0;

  let state: GraphState = {
    jobId: input.jobId,
    traceId: input.traceId,
    sourceType: input.sourceType,
    topicHint: input.topicHint,
    rawItems: input.rawItems,
    publishPolicy: input.publishPolicy,
    channel: input.channel,
    normalizedItems: [],
    retryCount,
  };

  let startIdx = 0;
  if (fromStep) {
    const stepIdx = STEPS.indexOf(fromStep as (typeof STEPS)[number]);
    startIdx = stepIdx >= 0 ? stepIdx : 0;
    const prevStep = startIdx > 0 ? STEPS[startIdx - 1] : null;
    const latest = prevStep
      ? await snapshotRepo.getByStep(input.jobId, prevStep)
      : null;
    if (latest && latest.stateJson && typeof latest.stateJson === "object") {
      const snapped = latest.stateJson as Record<string, unknown>;
      state = {
        ...state,
        normalizedItems: (snapped.normalizedItems as GraphState["normalizedItems"]) ?? state.normalizedItems,
        outline: (snapped.outline as string) ?? state.outline,
        topicScore: (snapped.topicScore as number) ?? state.topicScore,
        draft: (snapped.draft as string) ?? state.draft,
        reviewScore: (snapped.reviewScore as number) ?? state.reviewScore,
        reviewNotes: (snapped.reviewNotes as string) ?? state.reviewNotes,
        riskFlag: (snapped.riskFlag as boolean) ?? state.riskFlag,
        decision: (snapped.decision as string) ?? state.decision,
        promptVersions: (snapped.promptVersions as GraphState["promptVersions"]) ?? state.promptVersions,
        experimentAssignments: (snapped.experimentAssignments as GraphState["experimentAssignments"]) ?? state.experimentAssignments,
      };
    }
  }
  const stepsToRun = STEPS.slice(startIdx);

  try {
    for (const step of stepsToRun) {
      logger.info({ jobId: input.jobId, step }, "Graph step");
      let delta: Partial<GraphState> = {};

      switch (step) {
        case "normalize":
          delta = normalize(state);
          break;
        case "planner":
          if (state.normalizedItems.length === 0) {
            delta = { decision: "REJECTED" };
            break;
          }
          delta = await planner(state, deps as GraphContext);
          break;
        case "scorer":
          delta = await scorer(state, deps as GraphContext);
          break;
        case "writer":
          delta = await writer(state, deps as GraphContext);
          break;
        case "reviewer":
          delta = await reviewer(state, deps as GraphContext);
          break;
        case "decision":
          delta = decisionNode(state);
          break;
      }

      state = {
        ...state,
        ...delta,
        promptVersions: {
          ...state.promptVersions,
          ...(delta.promptVersions ?? {}),
        },
        experimentAssignments: {
          ...state.experimentAssignments,
          ...(delta.experimentAssignments ?? {}),
        },
      };

      await snapshotRepo.create({
        jobId: input.jobId,
        step,
        stateJson: stateToJson(state),
      });

      if (state.decision === "REJECTED" && step !== "decision") {
        break;
      }
    }

    const decision = state.decision ?? "REVIEW_REQUIRED";
    const nextVersion = await contentVersionRepo.getNextVersion(input.jobId);
    await contentVersionRepo.create({
      jobId: input.jobId,
      version: nextVersion,
      draft: state.draft,
      reviewScore: state.reviewScore,
    });
    await jobRepo.upsertOutput({
      jobId: input.jobId,
      outline: state.outline,
      draft: state.draft,
      reviewNotes: state.reviewNotes,
      finalDecisionPayload: {
        decision,
        topicScore: state.topicScore,
        reviewScore: state.reviewScore,
      },
      promptVersions: state.promptVersions,
      experimentAssignments: state.experimentAssignments,
    });
    const status =
      decision === DECISION.REVIEW_REQUIRED
        ? JOB_STATUS.REVIEW_REQUIRED
        : JOB_STATUS.COMPLETED;
    await jobRepo.updateStatus(input.jobId, {
      status,
      decision,
      topicScore: state.topicScore,
      reviewScore: state.reviewScore,
      completedAt: new Date(),
    });

    logger.info({ jobId: input.jobId, status, decision }, "Graph completed");
  } catch (err) {
    logger.error({ err, jobId: input.jobId }, "Graph failed");
    await jobRepo.updateStatus(input.jobId, {
      status: JOB_STATUS.FAILED,
      completedAt: new Date(),
    });
    throw err;
  }
}
