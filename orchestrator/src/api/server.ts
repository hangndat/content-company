import Fastify from "fastify";
import { randomUUID } from "crypto";
import cors from "@fastify/cors";
import { registerHealthRoutes } from "./routes/health.js";
import { registerJobRoutes } from "./routes/jobs.js";
import { registerApprovalRoutes } from "./routes/approval.js";
import { registerPublishCallbackRoute } from "./routes/publish-callback.js";
import { registerAcquirePublishSlotRoute } from "./routes/acquire-publish-slot.js";
import { registerMetricsRecordRoute } from "./routes/metrics-record.js";
import { registerPromptVersionRoutes } from "./routes/prompt-versions.js";
import { registerMetricsRoutes } from "./routes/metrics.js";
import { registerAggregateMetricsRoute } from "./routes/aggregate-metrics.js";
import { registerExperimentRoutes } from "./routes/experiments.js";
import { registerDashboardRoutes } from "./routes/dashboard.js";
import { createAuthMiddleware } from "./middleware/auth.js";
import { registerErrorHandler } from "./middleware/error.js";
import type { JobService } from "../services/job.js";
import type { JobQueueService } from "../services/job-queue.js";
import type { Redis } from "ioredis";
import type { PrismaClient } from "@prisma/client";
import type { Logger } from "pino";

export type ServerDeps = {
  redis: Redis;
  db: PrismaClient;
  jobService: JobService;
  jobQueue?: JobQueueService;
  logger: Logger;
  apiKey?: string;
};

export async function createServer(deps: ServerDeps) {
  const app = Fastify({
    loggerInstance: deps.logger.child({ module: "http" }),
  });

  await app.register(cors, { origin: true });

  registerErrorHandler(app);

  app.addHook("onRequest", async (req) => {
    const traceId = (req.headers["x-trace-id"] as string) || randomUUID();
    const jobId = req.headers["x-job-id"] as string | undefined;
    req.log = req.log.child({ traceId, ...(jobId && { jobId }) });
  });

  app.addHook("onRequest", createAuthMiddleware(deps.apiKey));

  await registerHealthRoutes(app, { redis: deps.redis, db: deps.db });
  await registerJobRoutes(app, { jobService: deps.jobService });
  await registerApprovalRoutes(app, { jobService: deps.jobService });
  await registerPublishCallbackRoute(app, { db: deps.db });
  await registerAcquirePublishSlotRoute(app, { db: deps.db, redis: deps.redis });
  await registerMetricsRecordRoute(app, { db: deps.db });
  await registerPromptVersionRoutes(app, { db: deps.db });
  await registerMetricsRoutes(app, { db: deps.db });
  await registerAggregateMetricsRoute(app, { db: deps.db, logger: deps.logger });
  await registerExperimentRoutes(app, { db: deps.db });
  await registerDashboardRoutes(app, { db: deps.db, jobQueue: deps.jobQueue });

  return app;
}
