import { Queue, Worker, type Job } from "bullmq";
import type { RunJobBody } from "../api/schemas.js";

export const QUEUE_NAME = "content_jobs";
export const JOB_NAME_RUN_GRAPH = "run-graph";

export type ContentJobData = {
  jobId: string;
  traceId: string;
  body: RunJobBody;
  fromStep?: string;
};

export type ContentJobResult = {
  jobId: string;
  status: string;
  decision?: string;
};

export type BullMQConnection = {
  host?: string;
  port?: number;
  url?: string;
  maxRetriesPerRequest: number | null;
  retryStrategy?: (times: number) => number;
};

/**
 * BullMQ queue for content jobs. jobId enforces single in-flight: only one job per jobId
 * can exist in waiting/delayed/active. Prevents double-processing.
 */
export function createContentJobQueue(connection: BullMQConnection) {
  return new Queue<ContentJobData, ContentJobResult>(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: { count: 1000 },
    },
  });
}

export function createContentJobWorker(
  connection: BullMQConnection,
  processor: (job: Job<ContentJobData, ContentJobResult>) => Promise<ContentJobResult>
) {
  return new Worker<ContentJobData, ContentJobResult>(
    QUEUE_NAME,
    processor,
    {
      connection,
      concurrency: 5,
    }
  );
}
