import type { Logger } from "pino";
import type { createJobRepo } from "../../repos/job.js";
import type { createIdempotency } from "../../redis/idempotency.js";
import type { createDedupe } from "../../redis/dedupe.js";
import type { createLock } from "../../redis/lock.js";
import { runGraph } from "../../graph/runner.js";
import { JOB_STATUS } from "../../config/constants.js";
import type { JobQueueService } from "../job-queue.js";
import type { Env } from "../../config/env.js";
import type { PrismaClient } from "@prisma/client";
import type { Redis } from "ioredis";
import { ERROR_CODES } from "./errors.js";
import type { RunJobInput, RunJobResult } from "./types.js";
import { resolveRawItemsFromTrendJob } from "./trend-raw-items.js";

export type ContentRunCtx = {
  db: PrismaClient;
  redis: Redis;
  logger: Logger;
  env: Env;
  jobQueue?: JobQueueService;
  jobRepo: ReturnType<typeof createJobRepo>;
  lock: ReturnType<typeof createLock>;
  idempotency: ReturnType<typeof createIdempotency>;
  dedupe: ReturnType<typeof createDedupe>;
  useQueue: boolean;
};

export async function runContentJob(input: RunJobInput, ctx: ContentRunCtx): Promise<RunJobResult> {
  const { jobId, traceId, idempotencyKey, ...body } = input;
  const { logger, env, jobQueue, jobRepo, lock, idempotency, dedupe, useQueue, db, redis } = ctx;

  let resolvedBody = body;
  if (body.trendJobId) {
    const rawItems = await resolveRawItemsFromTrendJob(jobRepo, body.trendJobId, body.topicIndex);
    resolvedBody = {
      ...body,
      rawItems,
      sourceType: "trend" as const,
    };
  }
  const rawItems = resolvedBody.rawItems ?? [];
  const sourceHash = body.trendJobId
    ? `trend-${body.trendJobId}-${body.topicIndex ?? "all"}`
    : dedupe.hash(rawItems);
  if (await dedupe.isDuplicate(sourceHash)) {
    logger.info({ sourceHash }, "Duplicate source, skipping");
    throw Object.assign(new Error("Source already processed recently"), {
      code: ERROR_CODES.CONFLICT,
    });
  }

  if (idempotencyKey) {
    const existing = await idempotency.get(idempotencyKey);
    if (existing) {
      const job = await jobRepo.findById(existing);
      if (job) {
        logger.info({ jobId: job.id, idempotencyKey }, "Idempotent duplicate request");
        return {
          jobId: job.id,
          traceId: job.traceId,
          status: job.status,
          decision: job.decision ?? undefined,
          createdAt: job.createdAt,
          completedAt: job.completedAt ?? undefined,
          duplicate: true,
        };
      }
    }
  }

  const existingJob = idempotencyKey ? await jobRepo.findByIdempotencyKey(idempotencyKey) : null;
  if (
    existingJob &&
    (existingJob.status === JOB_STATUS.PROCESSING || existingJob.status === "running" /* legacy */)
  ) {
    throw Object.assign(new Error("Job already running with this idempotency key"), {
      code: ERROR_CODES.CONFLICT,
    });
  }
  if (existingJob && existingJob.status === JOB_STATUS.COMPLETED) {
    return {
      jobId: existingJob.id,
      traceId: existingJob.traceId,
      status: existingJob.status,
      decision: existingJob.decision ?? undefined,
      createdAt: existingJob.createdAt,
      completedAt: existingJob.completedAt ?? undefined,
      duplicate: true,
    };
  }

  const finalJobId = existingJob?.id ?? jobId;
  const finalTraceId = existingJob?.traceId ?? traceId;

  const job = existingJob
    ? await jobRepo.findById(finalJobId)
    : await jobRepo.create({
        id: finalJobId,
        traceId: finalTraceId,
        sourceType: resolvedBody.sourceType,
        idempotencyKey,
        rawPayload: { ...resolvedBody },
        normalizedPayload: { rawItems: resolvedBody.rawItems, channel: resolvedBody.channel },
      });

  if (!job) throw new Error("Job not found or creation failed");
  if (idempotencyKey) {
    await idempotency.set(idempotencyKey, job.id);
  }

  if (useQueue) {
    if (job.status === JOB_STATUS.PROCESSING || job.status === "running") {
      throw Object.assign(new Error("Job is already processing"), {
        code: ERROR_CODES.CONFLICT,
      });
    }
    await jobQueue!.enqueue({
      jobId: job.id,
      traceId: job.traceId,
      body: resolvedBody,
    });
    await dedupe.markProcessed(sourceHash);
    return {
      jobId: job.id,
      traceId: job.traceId,
      status: JOB_STATUS.PENDING,
      createdAt: job.createdAt,
      duplicate: false,
    };
  }

  const acquired = await lock.acquire(job.id, traceId);
  if (!acquired) {
    throw Object.assign(new Error("Job is already running"), {
      code: ERROR_CODES.CONFLICT,
    });
  }

  await jobRepo.setProcessing(job.id);
  await dedupe.markProcessed(sourceHash);

  try {
    await runGraph(
      {
        jobId: job.id,
        traceId: job.traceId,
        ...resolvedBody,
      },
      { db, redis, logger, env }
    );
  } finally {
    await lock.release(job.id);
  }

  const updated = await jobRepo.findById(job.id);
  return {
    jobId: updated!.id,
    traceId: updated!.traceId,
    status: updated!.status,
    decision: updated!.decision ?? undefined,
    createdAt: updated!.createdAt,
    completedAt: updated!.completedAt ?? undefined,
    duplicate: false,
  };
}
