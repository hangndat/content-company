import { createJobRepo } from "../../repos/job.js";
import { createJobSnapshotRepo } from "../../repos/job-snapshot.js";
import { createApprovalRepo } from "../../repos/approval.js";
import { createLock } from "../../redis/lock.js";
import { createIdempotency } from "../../redis/idempotency.js";
import { createDedupe } from "../../redis/dedupe.js";
import { REDIS_TTL } from "../../config/constants.js";
import type { JobService, JobServiceDeps } from "./types.js";
import { runContentJob } from "./content-run.js";
import { runTrendJobFlow } from "./trend-run.js";
import { getJob, getJobDetail, listJobs } from "./read.js";
import { approveJob, rejectJob, replayJob } from "./lifecycle.js";

export type {
  JobService,
  JobServiceDeps,
  RunJobResult,
  ApproveRejectInput,
  JobDetailResult,
  JobListItem,
  RunTrendJobInput,
  RunJobInput,
  GetJobResult,
  ReplayResult,
} from "./types.js";

export function createJobService(deps: JobServiceDeps): JobService {
  const { db, redis, logger, env, jobQueue } = deps;
  const jobRepo = createJobRepo(db);
  const snapshotRepo = createJobSnapshotRepo(db);
  const approvalRepo = createApprovalRepo(db);
  const lock = createLock(redis, REDIS_TTL.JOB_LOCK);
  const idempotency = createIdempotency(redis, REDIS_TTL.IDEMPOTENCY);
  const dedupe = createDedupe(redis, REDIS_TTL.SOURCE_DEDUPE);
  const useQueue = Boolean(env.USE_QUEUE && jobQueue);

  const readCtx = { db, jobRepo, snapshotRepo };
  const trendCtx = { db, redis, logger, env, jobRepo, lock, idempotency };
  const contentCtx = {
    db,
    redis,
    logger,
    env,
    jobQueue,
    jobRepo,
    lock,
    idempotency,
    dedupe,
    useQueue,
  };
  const lifecycleCtx = { db, redis, logger, env, jobRepo, approvalRepo, lock };

  return {
    runJob: (input) => runContentJob(input, contentCtx),
    runTrendJob: (input) => runTrendJobFlow(input, trendCtx),
    getJob: (jobId) => getJob(jobId, readCtx),
    getJobDetail: (jobId) => getJobDetail(jobId, readCtx),
    listJobs: (opts) => listJobs(opts, readCtx),
    replayJob: (jobId, fromStep) => replayJob(jobId, fromStep, lifecycleCtx),
    approveJob: (jobId, input) => approveJob(jobId, input, lifecycleCtx),
    rejectJob: (jobId, input) => rejectJob(jobId, input, lifecycleCtx),
  };
}
