import type { Logger } from "pino";
import { createContentJobQueue, JOB_NAME_RUN_GRAPH } from "../queue/content-jobs.js";
import type { RunJobBody } from "../api/schemas.js";
import type { BullMQConnection } from "../queue/content-jobs.js";

export type EnqueueJobInput = {
  jobId: string;
  traceId: string;
  body: RunJobBody;
  fromStep?: string;
};

export type QueueJobCounts = {
  waiting: number;
  active: number;
  delayed: number;
  failed: number;
  completed: number;
  paused: number;
};

export interface JobQueueService {
  enqueue(input: EnqueueJobInput): Promise<{ jobId: string }>;
  getJobCounts(): Promise<QueueJobCounts | null>;
}

export function createJobQueueService(deps: {
  connection: BullMQConnection;
  logger: Logger;
}) {
  const queue = createContentJobQueue(deps.connection);

  return {
    async enqueue(input: EnqueueJobInput): Promise<{ jobId: string }> {
      const existing = await queue.getJob(input.jobId);
      if (existing) {
        const state = await existing.getState();
        if (state === "waiting" || state === "delayed" || state === "active") {
          deps.logger.info(
            { jobId: input.jobId, state },
            "Job already in queue, skip enqueue (prevents double-processing)"
          );
          return { jobId: input.jobId };
        }
      }
      await queue.add(
        JOB_NAME_RUN_GRAPH,
        {
          jobId: input.jobId,
          traceId: input.traceId,
          body: input.body,
          fromStep: input.fromStep,
        },
        { jobId: input.jobId }
      );
      deps.logger.info({ jobId: input.jobId }, "Job enqueued");
      return { jobId: input.jobId };
    },

    async getJobCounts(): Promise<QueueJobCounts | null> {
      try {
        const counts = await queue.getJobCounts(
          "wait",
          "active",
          "delayed",
          "failed",
          "completed",
          "paused"
        );
        return {
          waiting: (counts as { wait?: number }).wait ?? 0,
          active: counts.active ?? 0,
          delayed: counts.delayed ?? 0,
          failed: counts.failed ?? 0,
          completed: counts.completed ?? 0,
          paused: counts.paused ?? 0,
        };
      } catch (err) {
        deps.logger.warn({ err }, "Failed to get queue job counts");
        return null;
      }
    },
  };
}
