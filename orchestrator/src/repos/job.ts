import type { PrismaClient } from "@prisma/client";
import type { Decimal } from "@prisma/client/runtime/library";
import { JOB_STATUS } from "../config/constants.js";

export type CreateJobInput = {
  id: string;
  traceId: string;
  sourceType: string;
  idempotencyKey?: string;
  rawPayload: unknown;
  normalizedPayload: unknown;
};

export type UpdateJobScoresInput = {
  topicScore?: number;
  reviewScore?: number;
};

export type UpdateJobStatusInput = {
  status: string;
  decision?: string;
  topicScore?: number;
  reviewScore?: number;
  completedAt?: Date;
};

export type CreateJobOutputInput = {
  jobId: string;
  outline?: string;
  draft?: string;
  reviewNotes?: string;
  finalDecisionPayload?: unknown;
  promptVersions?: Record<string, number>;
  experimentAssignments?: Record<string, import("../experiments/assignment-meta.js").ExperimentAssignmentMeta>;
};

export function createJobRepo(db: PrismaClient) {
  return {
    async create(input: CreateJobInput) {
      return db.job.create({
        data: {
          id: input.id,
          traceId: input.traceId,
          status: JOB_STATUS.PENDING,
          sourceType: input.sourceType,
          idempotencyKey: input.idempotencyKey,
          inputs: {
            create: {
              rawPayload: input.rawPayload as object,
              normalizedPayload: input.normalizedPayload as object,
            },
          },
        },
        include: { inputs: true },
      });
    },

    async findById(id: string) {
      return db.job.findUnique({
        where: { id },
        include: { inputs: true, outputs: true },
      });
    },

    async findByIdempotencyKey(key: string) {
      return db.job.findUnique({
        where: { idempotencyKey: key },
        include: { inputs: true, outputs: true },
      });
    },

    async updateStatus(jobId: string, input: UpdateJobStatusInput) {
      const { topicScore, reviewScore, ...rest } = input;
      return db.job.update({
        where: { id: jobId },
        data: {
          ...rest,
          ...(topicScore != null && { topicScore }),
          ...(reviewScore != null && { reviewScore }),
        },
      });
    },

    async setProcessing(jobId: string) {
      return db.job.update({
        where: { id: jobId },
        data: { status: JOB_STATUS.PROCESSING },
      });
    },

    /** @deprecated use setProcessing */
    async setRunning(jobId: string) {
      return this.setProcessing(jobId);
    },

    async incrementRetryCount(jobId: string) {
      return db.job.update({
        where: { id: jobId },
        data: { retryCount: { increment: 1 } },
      });
    },

    async upsertOutput(input: CreateJobOutputInput) {
      return db.jobOutput.upsert({
        where: { jobId: input.jobId },
        create: {
          jobId: input.jobId,
          outline: input.outline,
          draft: input.draft,
          reviewNotes: input.reviewNotes,
          finalDecisionPayload: (input.finalDecisionPayload as object) ?? undefined,
          promptVersions: (input.promptVersions as object) ?? undefined,
          experimentAssignments: (input.experimentAssignments as object) ?? undefined,
        },
        update: {
          outline: input.outline,
          draft: input.draft,
          reviewNotes: input.reviewNotes,
          finalDecisionPayload: (input.finalDecisionPayload as object) ?? undefined,
          promptVersions: (input.promptVersions as object) ?? undefined,
          experimentAssignments: (input.experimentAssignments as object) ?? undefined,
        },
      });
    },

    toTopicScore(v: Decimal | null): number | null {
      return v ? Number(v) : null;
    },

    toReviewScore(v: Decimal | null): number | null {
      return v ? Number(v) : null;
    },
  };
}
