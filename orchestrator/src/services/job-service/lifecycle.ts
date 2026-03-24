import type { createJobRepo } from "../../repos/job.js";
import type { createApprovalRepo } from "../../repos/approval.js";
import type { createLock } from "../../redis/lock.js";
import { runGraph } from "../../graph/runner.js";
import { runTrendGraph } from "../../graph/trend-runner.js";
import type { RunJobBody } from "../../api/schemas.js";
import { DEFAULT_TREND_DOMAIN } from "../../trends/domain-profiles.js";
import { DECISION, JOB_STATUS } from "../../config/constants.js";
import type { Env } from "../../config/env.js";
import type { PrismaClient } from "@prisma/client";
import type { Redis } from "ioredis";
import type { Logger } from "pino";
import { ERROR_CODES } from "./errors.js";
import type { ApproveRejectInput, ReplayResult } from "./types.js";

export type LifecycleCtx = {
  db: PrismaClient;
  redis: Redis;
  logger: Logger;
  env: Env;
  jobRepo: ReturnType<typeof createJobRepo>;
  approvalRepo: ReturnType<typeof createApprovalRepo>;
  lock: ReturnType<typeof createLock>;
};

export async function replayJob(
  jobId: string,
  fromStep: string | undefined,
  ctx: LifecycleCtx
): Promise<ReplayResult | null> {
  const { jobRepo, lock, db, redis, logger, env } = ctx;
  const job = await jobRepo.findById(jobId);
  if (!job) return null;

  const acquired = await lock.acquire(job.id, job.traceId);
  if (!acquired) {
    return {
      jobId: job.id,
      traceId: job.traceId,
      status: job.status,
      createdAt: job.createdAt,
      conflict: true,
    };
  }

  try {
    await jobRepo.incrementRetryCount(job.id);
    await jobRepo.updateStatus(job.id, {
      status: JOB_STATUS.PENDING,
      decision: undefined,
      completedAt: undefined,
    });
    const norm = job.inputs?.normalizedPayload as
      | {
          rawItems?: RunJobBody["rawItems"];
          channel?: RunJobBody["channel"];
          domain?: string;
        }
      | undefined;
    const rawItems = norm?.rawItems ?? [];
    const channel = norm?.channel ?? { id: "unknown", type: "blog" as const, metadata: {} };
    const trendDomain = norm?.domain ?? DEFAULT_TREND_DOMAIN;

    if (job.sourceType === "trend_aggregate") {
      await runTrendGraph(
        {
          jobId: job.id,
          traceId: job.traceId,
          domain: trendDomain,
          rawItems,
          channel,
        },
        { db, redis, logger, env },
        fromStep
      );
    } else {
      const body: RunJobBody = {
        sourceType: job.sourceType as RunJobBody["sourceType"],
        rawItems,
        publishPolicy: "auto",
        channel,
      };
      await runGraph(
        {
          jobId: job.id,
          traceId: job.traceId,
          ...body,
        },
        { db, redis, logger, env },
        fromStep
      );
    }
  } finally {
    await lock.release(job.id);
  }

  const updated = await jobRepo.findById(job.id);
  if (!updated) return null;
  return {
    jobId: updated.id,
    traceId: updated.traceId,
    status: updated.status,
    createdAt: updated.createdAt,
  };
}

export async function approveJob(
  jobId: string,
  input: ApproveRejectInput,
  ctx: LifecycleCtx
): Promise<{ jobId: string } | null> {
  const { jobRepo, approvalRepo } = ctx;
  const job = await jobRepo.findById(jobId);
  if (!job) return null;
  if (job.decision !== DECISION.REVIEW_REQUIRED) {
    throw Object.assign(new Error("Job is not in REVIEW_REQUIRED state"), {
      code: ERROR_CODES.CONFLICT,
    });
  }

  await approvalRepo.create({
    jobId,
    action: "approve",
    actor: input.actor,
    reason: input.reason,
  });
  await jobRepo.updateStatus(jobId, {
    status: JOB_STATUS.COMPLETED,
    decision: DECISION.APPROVED,
    completedAt: new Date(),
  });

  return { jobId };
}

export async function rejectJob(
  jobId: string,
  input: { actor: string; reason: string },
  ctx: LifecycleCtx
): Promise<{ jobId: string } | null> {
  const { jobRepo, approvalRepo } = ctx;
  const job = await jobRepo.findById(jobId);
  if (!job) return null;

  await approvalRepo.create({
    jobId,
    action: "reject",
    actor: input.actor,
    reason: input.reason,
  });
  await jobRepo.updateStatus(jobId, {
    status: JOB_STATUS.COMPLETED,
    decision: DECISION.REJECTED,
    completedAt: new Date(),
  });

  return { jobId };
}
