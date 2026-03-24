import type { PrismaClient } from "@prisma/client";
import type { Redis } from "ioredis";
import type { Logger } from "pino";
import { createJobRepo } from "../repos/job.js";
import { createJobSnapshotRepo } from "../repos/job-snapshot.js";
import { createApprovalRepo } from "../repos/approval.js";
import { createLock } from "../redis/lock.js";
import { createIdempotency } from "../redis/idempotency.js";
import { createDedupe } from "../redis/dedupe.js";
import { runGraph } from "../graph/runner.js";
import type { RunJobBody } from "../api/schemas.js";
import { DECISION, JOB_STATUS, REDIS_TTL } from "../config/constants.js";
import type { JobQueueService } from "./job-queue.js";

export type JobServiceDeps = {
  db: PrismaClient;
  redis: Redis;
  logger: Logger;
  env: import("../config/env.js").Env;
  jobQueue?: JobQueueService;
};

export type RunJobResult = {
  jobId: string;
  traceId: string;
  status: string;
  decision?: string;
  createdAt: Date;
  completedAt?: Date;
  duplicate: boolean;
};

export type ApproveRejectInput = {
  actor: string;
  reason?: string;
};

export type JobDetailResult = {
  job: GetJobResult;
  input: { rawPayload: { rawItems?: unknown[] } } | null;
  steps: Array<{
    id: string;
    step: string;
    createdAt: Date;
    stateJson: Record<string, unknown>;
  }>;
};

export type JobListItem = {
  id: string;
  status: string;
  decision: string | null;
  sourceType: string;
  createdAt: Date;
  completedAt: Date | null;
};

export interface JobService {
  runJob(input: RunJobInput): Promise<RunJobResult>;
  getJob(jobId: string): Promise<GetJobResult | null>;
  getJobDetail(jobId: string): Promise<JobDetailResult | null>;
  listJobs(opts?: { limit?: number; offset?: number; status?: string }): Promise<{ items: JobListItem[] }>;
  replayJob(jobId: string, fromStep?: string): Promise<ReplayResult | null>;
  approveJob(jobId: string, input: ApproveRejectInput): Promise<{ jobId: string } | null>;
  rejectJob(jobId: string, input: { actor: string; reason: string }): Promise<{ jobId: string } | null>;
}

export type RunJobInput = RunJobBody & {
  jobId: string;
  traceId: string;
  idempotencyKey?: string;
};

export type GetJobResult = {
  id: string;
  traceId: string;
  status: string;
  decision: string | null;
  topicScore: unknown;
  reviewScore: unknown;
  retryCount: number;
  sourceType: string;
  createdAt: Date;
  completedAt: Date | null;
  outputs: { outline: string | null; draft: string | null; reviewNotes: string | null } | null;
};

export type ReplayResult = {
  jobId: string;
  traceId: string;
  status: string;
  createdAt: Date;
  conflict?: boolean;
};

export function createJobService(deps: JobServiceDeps): JobService {
  const { db, redis, logger, env, jobQueue } = deps;
  const jobRepo = createJobRepo(db);
  const snapshotRepo = createJobSnapshotRepo(db);
  const approvalRepo = createApprovalRepo(db);
  const lock = createLock(redis, REDIS_TTL.JOB_LOCK);
  const idempotency = createIdempotency(redis, REDIS_TTL.IDEMPOTENCY);
  const dedupe = createDedupe(redis, REDIS_TTL.SOURCE_DEDUPE);
  const useQueue = env.USE_QUEUE && jobQueue;

  return {
    async runJob(input): Promise<RunJobResult> {
      const { jobId, traceId, idempotencyKey, ...body } = input;

      const sourceHash = dedupe.hash(body.rawItems);
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
        (existingJob.status === JOB_STATUS.PROCESSING ||
          existingJob.status === "running" /* legacy */)
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
            sourceType: body.sourceType,
            idempotencyKey,
            rawPayload: { ...body },
            normalizedPayload: { rawItems: body.rawItems, channel: body.channel },
          });

      if (!job) throw new Error("Job not found or creation failed");
      if (idempotencyKey) {
        await idempotency.set(idempotencyKey, job.id);
      }

      if (useQueue) {
        if (
          job.status === JOB_STATUS.PROCESSING ||
          job.status === "running"
        ) {
          throw Object.assign(new Error("Job is already processing"), {
            code: ERROR_CODES.CONFLICT,
          });
        }
        await jobQueue!.enqueue({
          jobId: job.id,
          traceId: job.traceId,
          body,
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
        decision: updated!.decision ?? undefined,
        createdAt: updated!.createdAt,
        completedAt: updated!.completedAt ?? undefined,
        duplicate: false,
      };
    },

    async getJob(jobId: string) {
      const job = await jobRepo.findById(jobId);
      if (!job) return null;
      return {
        id: job.id,
        traceId: job.traceId,
        status: job.status,
        decision: job.decision,
        topicScore: job.topicScore,
        reviewScore: job.reviewScore,
        retryCount: job.retryCount,
        sourceType: job.sourceType,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        outputs: job.outputs,
      };
    },

    async getJobDetail(jobId: string) {
      const job = await jobRepo.findById(jobId);
      if (!job) return null;
      const snapshots = await snapshotRepo.listByJobId(jobId);
      return {
        job: {
          id: job.id,
          traceId: job.traceId,
          status: job.status,
          decision: job.decision,
          topicScore: job.topicScore,
          reviewScore: job.reviewScore,
          retryCount: job.retryCount,
          sourceType: job.sourceType,
          createdAt: job.createdAt,
          completedAt: job.completedAt,
          outputs: job.outputs,
        },
        input: job.inputs
          ? { rawPayload: (job.inputs.rawPayload as { rawItems?: unknown[] }) ?? {} }
          : null,
        steps: snapshots.map((s) => ({
          id: s.id,
          step: s.step,
          createdAt: s.createdAt,
          stateJson: (s.stateJson as Record<string, unknown>) ?? {},
        })),
      };
    },

    async listJobs(opts?: { limit?: number; offset?: number; status?: string }) {
      const limit = Math.min(Number(opts?.limit) || 20, 100);
      const offset = Math.max(0, Number(opts?.offset) || 0);
      const where = opts?.status ? { status: opts.status } : {};
      const jobs = await db.job.findMany({
        where,
        select: {
          id: true,
          status: true,
          decision: true,
          sourceType: true,
          createdAt: true,
          completedAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      });
      return {
        items: jobs.map((j) => ({
          id: j.id,
          status: j.status,
          decision: j.decision,
          sourceType: j.sourceType,
          createdAt: j.createdAt,
          completedAt: j.completedAt,
        })),
      };
    },

    async replayJob(jobId: string, fromStep?: string): Promise<ReplayResult | null> {
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
        const norm = job.inputs?.normalizedPayload as {
          rawItems?: RunJobBody["rawItems"];
          channel?: RunJobBody["channel"];
        } | undefined;
        const rawItems = norm?.rawItems ?? [];
        const channel = norm?.channel ?? { id: "unknown", type: "blog" as const, metadata: {} };
        const body: RunJobBody = {
          sourceType: job.sourceType as "rss" | "webhook" | "manual" | "api",
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
    },

    async approveJob(jobId: string, input: ApproveRejectInput) {
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
    },

    async rejectJob(jobId: string, input: { actor: string; reason: string }) {
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
    },
  };
}

const ERROR_CODES = { CONFLICT: "CONFLICT" } as const;
