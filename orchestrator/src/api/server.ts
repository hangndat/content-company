import Fastify, { type FastifyInstance } from "fastify";
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
import { registerPublishedRoutes } from "./routes/published.js";
import { registerTrendTopicsRoutes } from "./routes/trend-topics.js";
import { registerCrawledArticlesRoutes } from "./routes/crawled-articles.js";
import { registerTrendContentSourceRoutes } from "./routes/trend-sources.js";
import { registerContentDraftRoutes } from "./routes/content-drafts.js";
import { createAuthMiddleware } from "./middleware/auth.js";
import { registerErrorHandler } from "./middleware/error.js";
import type { JobService } from "../services/job.js";
import type { JobQueueService } from "../services/job-queue.js";
import type { Redis } from "ioredis";
import type { PrismaClient } from "@prisma/client";
import type { Logger } from "pino";
import type { Env } from "../config/env.js";
import { registerObservabilityRoutes } from "./routes/observability.js";
import { createRepos } from "../repos/index.js";

export type ServerDeps = {
  redis: Redis;
  db: PrismaClient;
  jobService: JobService;
  jobQueue?: JobQueueService;
  logger: Logger;
  apiKey?: string;
  env: Env;
};

export async function createServer(deps: ServerDeps) {
  const repos = createRepos(deps.db);

  const app = Fastify({
    loggerInstance: deps.logger.child({ module: "http" }),
    bodyLimit: 10 * 1024 * 1024, // 10MB for trend job with many RSS items
  }) as unknown as FastifyInstance;

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
  await registerPublishCallbackRoute(app, { publishedRepo: repos.published });
  await registerAcquirePublishSlotRoute(app, {
    redis: deps.redis,
    jobRepo: repos.job,
    publishedRepo: repos.published,
  });
  await registerMetricsRecordRoute(app, {
    jobRepo: repos.job,
    contentMetricRepo: repos.contentMetric,
  });
  await registerPromptVersionRoutes(app, {
    promptVersionRepo: repos.promptVersion,
    db: deps.db,
    logger: deps.logger,
    env: deps.env,
  });
  await registerMetricsRoutes(app, { jobRepo: repos.job });
  await registerAggregateMetricsRoute(app, { db: deps.db, logger: deps.logger });
  await registerExperimentRoutes(app, {
    experimentRepo: repos.experiment,
    promptVersionRepo: repos.promptVersion,
  });
  await registerDashboardRoutes(app, { db: deps.db, jobQueue: deps.jobQueue });
  await registerPublishedRoutes(app, { publishedRepo: repos.published });
  await registerTrendTopicsRoutes(app, { trendTopicObservationRepo: repos.trendTopicObservation });
  await registerCrawledArticlesRoutes(app, { crawledArticleRepo: repos.crawledArticle });
  await registerTrendContentSourceRoutes(app, {
    trendContentSourceRepo: repos.trendContentSource,
    jobService: deps.jobService,
  });
  await registerContentDraftRoutes(app, { contentDraftRepo: repos.contentDraft });
  await registerObservabilityRoutes(app, deps.env);

  return app;
}
