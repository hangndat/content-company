import { api } from "@/lib/api";

export const jobService = {
  listJobs: (params?: { limit?: number; offset?: number; status?: string; sourceType?: string }) =>
    api.jobs(params),

  getJobDetail: (id: string) => api.jobDetail(id),

  approveJob: (id: string, body: { actor: string; reason?: string }) => api.approveJob(id, body),

  rejectJob: (id: string, body: { actor: string; reason: string }) => api.rejectJob(id, body),

  replayJob: (id: string, body?: { fromStep?: string }) => api.replayJob(id, body),
};
