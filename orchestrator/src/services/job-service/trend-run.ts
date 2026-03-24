import type { Logger } from "pino";
import type { createJobRepo } from "../../repos/job.js";
import type { createLock } from "../../redis/lock.js";
import type { createIdempotency } from "../../redis/idempotency.js";
import { runTrendGraph } from "../../graph/trend-runner.js";
import type { Env } from "../../config/env.js";
import type { PrismaClient } from "@prisma/client";
import type { Redis } from "ioredis";
import { ERROR_CODES } from "./errors.js";
import type { RunTrendJobInput, RunJobResult } from "./types.js";

export type TrendRunCtx = {
  db: PrismaClient;
  redis: Redis;
  logger: Logger;
  env: Env;
  jobRepo: ReturnType<typeof createJobRepo>;
  lock: ReturnType<typeof createLock>;
  idempotency: ReturnType<typeof createIdempotency>;
};

export async function runTrendJobFlow(input: RunTrendJobInput, ctx: TrendRunCtx): Promise<RunJobResult> {
  const { jobId, traceId, idempotencyKey, ...body } = input;
  const { jobRepo, lock, idempotency, db, redis, logger, env } = ctx;
  const finalJobId = jobId;
  const finalTraceId = traceId;

  const job = await jobRepo.create({
    id: finalJobId,
    traceId: finalTraceId,
    sourceType: "trend_aggregate",
    idempotencyKey,
    rawPayload: { ...body },
    normalizedPayload: {
      rawItems: body.rawItems,
      channel: body.channel,
      domain: body.domain,
    },
  });

  if (idempotencyKey) {
    await idempotency.set(idempotencyKey, job.id);
  }

  const acquired = await lock.acquire(job.id, traceId);
  if (!acquired) {
    throw Object.assign(new Error("Job is already running"), {
      code: ERROR_CODES.CONFLICT,
    });
  }

  await jobRepo.setProcessing(job.id);

  try {
    await runTrendGraph(
      {
        jobId: job.id,
        traceId: job.traceId,
        ...body,
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
    createdAt: updated!.createdAt,
    completedAt: updated!.completedAt ?? undefined,
    duplicate: false,
  };
}
