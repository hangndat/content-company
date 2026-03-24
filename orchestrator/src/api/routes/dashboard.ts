import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { getDashboardSummary } from "../../dashboard/summary.js";
import { getJobTrends } from "../../dashboard/job-trends.js";
import { getPublishMetrics } from "../../dashboard/publish.js";
import { getTopicPerformance } from "../../dashboard/topics.js";
import { getChannelPerformance } from "../../dashboard/channels.js";
import {
  getPromptPerformance,
  getPromptVersionsDetail,
} from "../../dashboard/prompts.js";
import { getExperimentsOverview } from "../../dashboard/experiments-overview.js";
import type { JobQueueService } from "../../services/job-queue.js";
import { ERROR_CODES, formatErrorResponse } from "../middleware/error.js";

const summaryQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional().default(1),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const jobTrendsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).optional().default(7),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  granularity: z.enum(["hour", "day"]).optional().default("day"),
});

const publishQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).optional().default(7),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const topicsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).optional().default(7),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  sortBy: z.enum(["avgCtr", "sampleCount", "avgReviewScore"]).optional().default("avgCtr"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

const channelsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).optional().default(7),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const promptsQuerySchema = z.object({
  type: z.string().optional().default("writer"),
  days: z.coerce.number().int().min(1).max(90).optional().default(14),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const experimentsQuerySchema = z.object({
  status: z.string().optional(),
  nodeType: z.string().optional(),
  scope: z.string().optional(),
});

export async function registerDashboardRoutes(
  app: FastifyInstance,
  deps: { db: PrismaClient; jobQueue?: JobQueueService }
) {
  const { db, jobQueue } = deps;

  app.get("/v1/dashboard/summary", async (req, reply) => {
    const parsed = summaryQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send(
        formatErrorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          "Invalid query params",
          parsed.error.flatten()
        )
      );
    }
    const { days, from, to } = parsed.data;

    let queueCounts: Awaited<ReturnType<NonNullable<JobQueueService>["getJobCounts"]>> = null;
    if (jobQueue) {
      queueCounts = await jobQueue.getJobCounts();
    }

    const summary = await getDashboardSummary(db, {
      days,
      from,
      to,
      queueCounts:
        queueCounts != null
          ? {
              wait: queueCounts.waiting,
              active: queueCounts.active,
              delayed: queueCounts.delayed,
              failed: queueCounts.failed,
              completed: queueCounts.completed,
              paused: queueCounts.paused,
            }
          : null,
    });

    return summary;
  });

  app.get("/v1/dashboard/job-trends", async (req, reply) => {
    const parsed = jobTrendsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send(
        formatErrorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          "Invalid query params",
          parsed.error.flatten()
        )
      );
    }
    const { days, from, to, granularity } = parsed.data;
    const result = await getJobTrends(db, { days, from, to, granularity });
    return result;
  });

  app.get("/v1/dashboard/queue", async () => {
    if (!jobQueue) {
      return { queue: null, semantics: { note: "Queue not configured (USE_QUEUE=false)" } };
    }
    const counts = await jobQueue.getJobCounts();
    if (counts == null) {
      return { queue: null, semantics: { note: "Failed to fetch queue stats" } };
    }
    return {
      queue: counts,
      semantics: { note: "BullMQ job counts" },
    };
  });

  app.get("/v1/dashboard/publish", async (req, reply) => {
    const parsed = publishQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send(
        formatErrorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          "Invalid query params",
          parsed.error.flatten()
        )
      );
    }
    const { days, from, to } = parsed.data;
    const result = await getPublishMetrics(db, { days, from, to });
    return result;
  });

  app.get("/v1/dashboard/topics", async (req, reply) => {
    const parsed = topicsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send(
        formatErrorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          "Invalid query params",
          parsed.error.flatten()
        )
      );
    }
    const result = await getTopicPerformance(db, parsed.data);
    return result;
  });

  app.get("/v1/dashboard/channels", async (req, reply) => {
    const parsed = channelsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send(
        formatErrorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          "Invalid query params",
          parsed.error.flatten()
        )
      );
    }
    const result = await getChannelPerformance(db, parsed.data);
    return result;
  });

  app.get("/v1/dashboard/prompts", async (req, reply) => {
    const parsed = promptsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send(
        formatErrorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          "Invalid query params",
          parsed.error.flatten()
        )
      );
    }
    const result = await getPromptPerformance(db, parsed.data);
    return result;
  });

  app.get("/v1/dashboard/prompts/versions", async (req, reply) => {
    const parsed = z
      .object({ type: z.string().optional().default("writer") })
      .safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send(
        formatErrorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          "Invalid query params",
          parsed.error.flatten()
        )
      );
    }
    const result = await getPromptVersionsDetail(db, parsed.data);
    return result;
  });

  app.get("/v1/dashboard/experiments", async (req, reply) => {
    const parsed = experimentsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send(
        formatErrorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          "Invalid query params",
          parsed.error.flatten()
        )
      );
    }
    const result = await getExperimentsOverview(db, parsed.data);
    return result;
  });
}
