import { api } from "@/lib/api";

const toRecord = (p?: Record<string, string | number>) =>
  p as Record<string, string | number> | undefined;

export const dashboardService = {
  getSummary: (params?: { days?: number; from?: string; to?: string }) => api.summary(params),

  getJobTrends: (params?: {
    days?: number;
    from?: string;
    to?: string;
    granularity?: "hour" | "day";
  }) =>
    api.jobTrends(
      params
        ? {
            days: params.days,
            from: params.from,
            to: params.to,
            granularity: params.granularity,
          }
        : undefined
    ),

  getTopics: (params?: {
    days?: number;
    from?: string;
    to?: string;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  }) => api.topics(toRecord(params)),

  getPrompts: (params?: { type?: string; days?: number; limit?: number }) =>
    api.prompts(toRecord(params)),

  getChannels: (params?: { days?: number; limit?: number }) => api.channels(toRecord(params)),

  getExperiments: (params?: { status?: string; nodeType?: string; scope?: string }) =>
    api.experiments(
      params ? { status: params.status, nodeType: params.nodeType, scope: params.scope } : undefined
    ),

  getQueue: () => api.queue(),

  getPublish: (params?: { days?: number; from?: string; to?: string }) =>
    api.publish(params ? { days: params.days, from: params.from, to: params.to } : undefined),
};
