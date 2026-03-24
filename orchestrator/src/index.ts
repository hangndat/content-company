import { loadEnv } from "./config/env.js";
import { createLogger } from "./lib/logger.js";
import { getPrisma } from "./db/client.js";
import { getRedis, getBullMQConnectionOptions } from "./redis/client.js";
import { createJobService } from "./services/job.js";
import { createJobQueueService } from "./services/job-queue.js";
import { createServer } from "./api/server.js";

async function main() {
  const env = loadEnv();
  const logger = createLogger(env.NODE_ENV);

  const db = getPrisma(logger);
  const redis = getRedis(env.REDIS_URL, logger);

  await redis.connect().catch((err: Error) => {
    logger.error({ err }, "Redis connect failed");
    process.exit(1);
  });

  const queueConnection = env.USE_QUEUE ? getBullMQConnectionOptions(env.REDIS_URL) : null;
  const jobQueue =
    queueConnection && env.USE_QUEUE
      ? createJobQueueService({ connection: queueConnection, logger })
      : undefined;
  const jobService = createJobService({ db, redis, logger, env, jobQueue });
  const app = await createServer({
    redis,
    db,
    jobService,
    jobQueue,
    logger,
    apiKey: env.API_KEY,
  });

  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    logger.info({ port: env.PORT }, "Orchestrator started");
  } catch (err) {
    logger.error({ err }, "Failed to start server");
    process.exit(1);
  }
}

main();
