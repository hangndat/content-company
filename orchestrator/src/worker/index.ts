import "dotenv/config";
import { loadEnv } from "../config/env.js";
import { createLogger } from "../lib/logger.js";
import { getPrisma } from "../db/client.js";
import { getRedis, getBullMQConnectionOptions } from "../redis/client.js";
import { createContentJobWorker } from "../queue/content-jobs.js";
import { runGraph } from "../graph/runner.js";
import { createLock } from "../redis/lock.js";
import { createJobRepo } from "../repos/job.js";
import { JOB_STATUS, REDIS_TTL } from "../config/constants.js";
import type { ContentJobResult } from "../queue/content-jobs.js";

async function main() {
  const env = loadEnv();
  const logger = createLogger(env.NODE_ENV);

  const db = getPrisma(logger);
  const redisApp = getRedis(env.REDIS_URL, logger);
  const queueConnection = getBullMQConnectionOptions(env.REDIS_URL);

  await redisApp.connect().catch((err: Error) => {
    logger.error({ err }, "Redis connect failed");
    process.exit(1);
  });

  const lock = createLock(redisApp, REDIS_TTL.JOB_LOCK);
  const jobRepo = createJobRepo(db);

  const worker = createContentJobWorker(
    queueConnection,
    async (job): Promise<ContentJobResult> => {
      const { jobId, traceId, body, fromStep } = job.data;
      logger.info({ jobId, traceId, attempt: job.attemptsMade }, "Processing content job");

      const acquired = await lock.acquire(jobId, traceId);
      if (!acquired) {
        throw new Error("Job already running (lock held)");
      }

      try {
        await jobRepo.setProcessing(jobId);
        await runGraph(
          { jobId, traceId, ...body },
          { db, redis: redisApp, logger, env },
          fromStep
        );
      } finally {
        await lock.release(jobId);
      }

      const updated = await jobRepo.findById(jobId);
      return {
        jobId,
        status: updated?.status ?? JOB_STATUS.COMPLETED,
        decision: updated?.decision ?? undefined,
      };
    }
  );

  worker.on("completed", (_job, result) => {
    logger.info({ jobId: result.jobId, decision: result.decision }, "Job completed");
  });

  worker.on("failed", (failedJob, err) => {
    logger.error({ jobId: failedJob?.data.jobId, err }, "Job failed");
    if (failedJob && failedJob.attemptsMade >= (failedJob.opts.attempts ?? 3)) {
      logger.error({ jobId: failedJob.data.jobId }, "Job moved to failed - manual replay required");
    }
  });

  logger.info("Worker started, waiting for jobs...");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
