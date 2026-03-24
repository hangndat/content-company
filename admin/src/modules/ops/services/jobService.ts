import { api } from "../../../api";
import type { JobDetailResponse, JobsListResponse } from "../models/job";

export const jobService = {
  listJobs: (params?: { limit?: number; offset?: number; status?: string }) =>
    api.jobs(params).then((r) => r as JobsListResponse),

  getJobDetail: (id: string) =>
    api.jobDetail(id).then((r) => r as JobDetailResponse),

  approveJob: (id: string, body: { actor: string; reason?: string }) =>
    api.approveJob(id, body),

  rejectJob: (id: string, body: { actor: string; reason: string }) =>
    api.rejectJob(id, body),

  replayJob: (id: string, body?: { fromStep?: string }) =>
    api.replayJob(id, body),
};
