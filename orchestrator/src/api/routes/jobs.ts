import type { FastifyInstance } from "fastify";
import { randomUUID } from "crypto";
import {
  runJobBodySchema,
  runTrendJobBodySchema,
  replayBodySchema,
} from "../schemas.js";
import { getTraceContext } from "../middleware/trace.js";
import { ERROR_CODES, formatErrorResponse } from "../middleware/error.js";
import type { JobDetailResult, JobService } from "../../services/job.js";

export async function registerJobRoutes(
  app: FastifyInstance,
  deps: { jobService: JobService }
) {
  const { jobService } = deps;

  app.post<{
    Body: unknown;
  }>("/v1/jobs/trend/run", async (req, reply) => {
    const ctx = getTraceContext(req);
    const parsed = runTrendJobBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send(
        formatErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Invalid request body", parsed.error.flatten())
      );
    }
    const body = parsed.data;
    const jobId = (req.headers["x-job-id"] as string) || body.jobId || randomUUID();
    const traceId = ctx.traceId;
    const idempotencyKey = ctx.idempotencyKey;

    const result = await jobService.runTrendJob({
      jobId,
      traceId,
      idempotencyKey,
      ...body,
    });

    if (result.duplicate) {
      return reply.status(201).send({
        jobId: result.jobId,
        traceId: result.traceId,
        status: result.status,
        createdAt: result.createdAt,
        completedAt: result.completedAt,
      });
    }

    return reply.status(200).send({
      jobId: result.jobId,
      traceId: result.traceId,
      status: result.status,
      createdAt: result.createdAt,
      completedAt: result.completedAt,
    });
  });

  app.post<{
    Body: unknown;
  }>("/v1/jobs/content/run", async (req, reply) => {
    const ctx = getTraceContext(req);
    const parsed = runJobBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send(
        formatErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Invalid request body", parsed.error.flatten())
      );
    }
    const body = parsed.data;
    const jobId = (req.headers["x-job-id"] as string) || body.jobId || randomUUID();
    const traceId = ctx.traceId;
    const idempotencyKey = ctx.idempotencyKey;

    const result = await jobService.runJob({
      jobId,
      traceId,
      idempotencyKey,
      ...body,
    });

    if (result.duplicate) {
      return reply.status(201).send({
        jobId: result.jobId,
        traceId: result.traceId,
        status: result.status,
        decision: result.decision,
        createdAt: result.createdAt,
        completedAt: result.completedAt,
      });
    }

    return reply.status(200).send({
      jobId: result.jobId,
      traceId: result.traceId,
      status: result.status,
      createdAt: result.createdAt,
    });
  });

  app.get<{
    Querystring: { limit?: number; offset?: number; status?: string; sourceType?: string };
  }>("/v1/jobs", async (req) => {
    const { limit, offset, status, sourceType } = req.query;
    const result = await jobService.listJobs({ limit, offset, status, sourceType });
    return result;
  });

  app.get<{
    Params: { jobId: string };
  }>("/v1/jobs/:jobId", async (req, reply) => {
    const { jobId } = req.params;
    const job = await jobService.getJob(jobId);
    if (!job) {
      return reply.status(404).send(
        formatErrorResponse(ERROR_CODES.NOT_FOUND, "Job not found", { jobId })
      );
    }
    return {
      jobId: job.id,
      traceId: job.traceId,
      status: job.status,
      decision: job.decision,
      scores: {
        topicScore: job.topicScore != null ? Number(job.topicScore) : null,
        reviewScore: job.reviewScore != null ? Number(job.reviewScore) : null,
      },
      retryCount: job.retryCount,
      sourceType: job.sourceType,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      output: job.outputs
        ? {
            outline: job.outputs.outline,
            draft: job.outputs.draft,
            reviewNotes: job.outputs.reviewNotes,
            trendCandidates: (job.outputs as { trendCandidates?: unknown }).trendCandidates ?? undefined,
          }
        : undefined,
    };
  });

  app.get<{
    Params: { jobId: string };
  }>("/v1/jobs/:jobId/detail", async (req, reply) => {
    const { jobId } = req.params;
    const detail = await jobService.getJobDetail(jobId);
    if (!detail) {
      return reply.status(404).send(
        formatErrorResponse(ERROR_CODES.NOT_FOUND, "Job not found", { jobId })
      );
    }
    return {
      job: {
        jobId: detail.job.id,
        traceId: detail.job.traceId,
        status: detail.job.status,
        decision: detail.job.decision,
        scores: {
          topicScore: detail.job.topicScore != null ? Number(detail.job.topicScore) : null,
          reviewScore: detail.job.reviewScore != null ? Number(detail.job.reviewScore) : null,
        },
        retryCount: detail.job.retryCount,
        sourceType: detail.job.sourceType,
        createdAt: detail.job.createdAt,
        completedAt: detail.job.completedAt,
        output: detail.job.outputs
          ? {
              outline: detail.job.outputs.outline,
              draft: detail.job.outputs.draft,
              reviewNotes: detail.job.outputs.reviewNotes,
              trendCandidates: (detail.job.outputs as { trendCandidates?: unknown }).trendCandidates ?? undefined,
            }
          : undefined,
      },
      input: detail.input,
      approvals: detail.approvals.map((a) => ({
        id: a.id,
        action: a.action,
        actor: a.actor,
        reason: a.reason,
        createdAt: a.createdAt,
      })),
      steps: detail.steps.map((s: JobDetailResult["steps"][number]) => ({
        id: s.id,
        step: s.step,
        createdAt: s.createdAt,
        stateJson: s.stateJson,
      })),
      contentDraft: detail.contentDraft
        ? {
            id: detail.contentDraft.id,
            outline: detail.contentDraft.outline,
            body: detail.contentDraft.body,
            reviewNotes: detail.contentDraft.reviewNotes,
            decision: detail.contentDraft.decision,
            scores: {
              topicScore: detail.contentDraft.topicScore,
              reviewScore: detail.contentDraft.reviewScore,
            },
            createdAt: detail.contentDraft.createdAt,
            updatedAt: detail.contentDraft.updatedAt,
          }
        : null,
    };
  });

  app.post<{
    Params: { jobId: string };
    Body: unknown;
  }>("/v1/jobs/:jobId/replay", async (req, reply) => {
    const { jobId } = req.params;
    const parsed = replayBodySchema.safeParse(req.body ?? {});
    const fromStep = parsed.success ? parsed.data.fromStep : undefined;

    const result = await jobService.replayJob(jobId, fromStep);
    if (!result) {
      return reply.status(404).send(
        formatErrorResponse(ERROR_CODES.NOT_FOUND, "Job not found", { jobId })
      );
    }
    if (result.conflict) {
      return reply.status(409).send(
        formatErrorResponse(ERROR_CODES.CONFLICT, "Job is already running", { jobId })
      );
    }

    return reply.status(200).send({
      jobId: result.jobId,
      traceId: result.traceId,
      status: result.status,
      createdAt: result.createdAt,
    });
  });
}
