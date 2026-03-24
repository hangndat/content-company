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
import { JOB_STATUS } from "../../config/constants.js";
import { DEFAULT_TREND_DOMAIN } from "../../trends/domain-profiles.js";
import {
  filterRawItemsForTrendDedup,
  ingestCrawledArticles,
} from "../crawled-articles.js";
import { enrichItemsTrendContentSourceFromRegistry } from "../../lib/trend-source-auto-link.js";

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
  const { jobRepo, lock, idempotency, db, redis, logger, env } = ctx;
  const {
    jobId,
    traceId,
    idempotencyKey,
    skipArticleDedup,
    domain = DEFAULT_TREND_DOMAIN,
    rawItems: incomingRawItems,
    channel,
    trendContentSourceId,
  } = input;

  const { enrichedCount } = await enrichItemsTrendContentSourceFromRegistry(db, domain, incomingRawItems);
  if (enrichedCount > 0) {
    logger.info({ domain, enrichedCount }, "Auto-linked rawItems to trend_content_source from registry (URL match)");
  }

  const sourceIdsToValidate = new Set<string>();
  if (trendContentSourceId) sourceIdsToValidate.add(trendContentSourceId);
  for (const item of incomingRawItems) {
    if (item.trendContentSourceId) sourceIdsToValidate.add(item.trendContentSourceId);
  }
  if (sourceIdsToValidate.size > 0) {
    const rows = await db.trendContentSource.findMany({
      where: { id: { in: [...sourceIdsToValidate] } },
      select: { id: true, trendDomain: true },
    });
    if (rows.length !== sourceIdsToValidate.size) {
      throw Object.assign(new Error("One or more trendContentSourceId values not found"), {
        code: ERROR_CODES.NOT_FOUND,
      });
    }
    for (const r of rows) {
      if (r.trendDomain !== domain) {
        throw Object.assign(
          new Error(
            `trendContentSourceId domain mismatch: source ${r.id} is "${r.trendDomain}", request domain is "${domain}"`
          ),
          { code: ERROR_CODES.VALIDATION_ERROR }
        );
      }
    }
  }

  await ingestCrawledArticles(db, domain, incomingRawItems, {
    trendContentSourceId: trendContentSourceId,
  });

  const skipDedup = skipArticleDedup === true;
  const { kept, dropped } = await filterRawItemsForTrendDedup(db, domain, incomingRawItems, {
    enabled: env.TREND_CRAWL_DEDUP_ENABLED,
    skip: skipDedup,
    dedupHours: env.TREND_CRAWL_DEDUP_HOURS,
  });

  const rawItemsForGraph = kept.map((i) => ({
    ...i,
    body: i.body ?? "",
  }));

  if (kept.length === 0) {
    throw Object.assign(
      new Error(
        `No articles to process after crawl dedup (in=${incomingRawItems.length}, dropped=${dropped}). Use skipArticleDedup or wait for dedup window.`
      ),
      { code: ERROR_CODES.CONFLICT }
    );
  }

  if (idempotencyKey) {
    const existingId = await idempotency.get(idempotencyKey);
    if (existingId) {
      const job = await jobRepo.findById(existingId);
      if (job) {
        logger.info({ jobId: job.id, idempotencyKey }, "Trend idempotent duplicate (redis)");
        return {
          jobId: job.id,
          traceId: job.traceId,
          status: job.status,
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
      createdAt: existingJob.createdAt,
      completedAt: existingJob.completedAt ?? undefined,
      duplicate: true,
    };
  }

  const finalJobId = existingJob?.id ?? jobId;
  const finalTraceId = existingJob?.traceId ?? traceId;

  const job =
    existingJob ??
    (await jobRepo.create({
      id: finalJobId,
      traceId: finalTraceId,
      sourceType: "trend_aggregate",
      idempotencyKey,
      rawPayload: {
        domain,
        channel,
        rawItems: incomingRawItems,
        skipArticleDedup: skipDedup,
        ...(trendContentSourceId ? { trendContentSourceId } : {}),
        dedup: {
          inCount: incomingRawItems.length,
          processCount: rawItemsForGraph.length,
          dropped,
        },
      },
      normalizedPayload: {
        rawItems: rawItemsForGraph,
        channel,
        domain,
      },
    }));

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
        domain,
        rawItems: rawItemsForGraph,
        channel,
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
