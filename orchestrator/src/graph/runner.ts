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
import { createContentDraftRepo } from "../repos/content-draft.js";
import { createJobSnapshotRepo } from "../repos/job-snapshot.js";
import { JOB_STATUS, DECISION } from "../config/constants.js";
import { runStepsWithSnapshots } from "./run-steps-with-snapshots.js";
import { hydrateContentStateFromSnapshot } from "./hydrate-content-state.js";

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
  const contentDraftRepo = createContentDraftRepo(db);
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
    if (latest?.stateJson && typeof latest.stateJson === "object") {
      state = hydrateContentStateFromSnapshot(state, latest.stateJson as Record<string, unknown>);
    }
  }
  const stepsToRun = STEPS.slice(startIdx);

  try {
    state = await runStepsWithSnapshots({
      jobId: input.jobId,
      logger,
      logLabel: "Graph step",
      steps: stepsToRun,
      initialState: state,
      onStep: async (step, prev) => {
        let delta: Partial<GraphState> = {};

        switch (step) {
          case "normalize":
            delta = normalize(prev);
            break;
          case "planner":
            if (prev.normalizedItems.length === 0) {
              delta = { decision: "REJECTED" };
              break;
            }
            delta = await planner(prev, deps as GraphContext);
            break;
          case "scorer":
            delta = await scorer(prev, deps as GraphContext);
            break;
          case "writer":
            delta = await writer(prev, deps as GraphContext);
            break;
          case "reviewer":
            delta = await reviewer(prev, deps as GraphContext);
            break;
          case "decision":
            delta = decisionNode(prev);
            break;
        }

        const next: GraphState = {
          ...prev,
          ...delta,
          promptVersions: {
            ...prev.promptVersions,
            ...(delta.promptVersions ?? {}),
          },
          experimentAssignments: {
            ...prev.experimentAssignments,
            ...(delta.experimentAssignments ?? {}),
          },
        };

        const done = next.decision === "REJECTED" && step !== "decision";
        return { next, done };
      },
      persistSnapshot: async (step, s) => {
        await snapshotRepo.create({
          jobId: input.jobId,
          step,
          stateJson: stateToJson(s),
        });
      },
    });

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
    await contentDraftRepo.upsert({
      jobId: input.jobId,
      outline: state.outline ?? null,
      body: state.draft ?? null,
      reviewNotes: state.reviewNotes ?? null,
      decision,
      topicScore: state.topicScore ?? null,
      reviewScore: state.reviewScore ?? null,
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
