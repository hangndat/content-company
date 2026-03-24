import { api } from "../../../api";
import type {
  DashboardSummary,
  JobTrendsResult,
  TopicsResult,
  PromptsResult,
  ChannelsResult,
  PublishMetricsResult,
  QueueResult,
} from "../models/dashboard";
import type { ExperimentsOverviewResult } from "../models/experiment";

const toRecord = (p?: Record<string, string | number>) =>
  p as Record<string, string | number> | undefined;

export const dashboardService = {
  getSummary: (params?: { days?: number; from?: string; to?: string }) =>
    api.summary(params).then((r) => r as DashboardSummary),

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
    ).then((r) => r as JobTrendsResult),

  getTopics: (params?: {
    days?: number;
    from?: string;
    to?: string;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  }) =>
    api.topics(toRecord(params)).then((r) => r as TopicsResult),

  getPrompts: (params?: { type?: string; days?: number; limit?: number }) =>
    api.prompts(toRecord(params)).then((r) => r as PromptsResult),

  getChannels: (params?: { days?: number; limit?: number }) =>
    api.channels(toRecord(params)).then((r) => r as ChannelsResult),

  getExperiments: (params?: {
    status?: string;
    nodeType?: string;
    scope?: string;
  }) =>
    api.experiments(
      params ? { status: params.status, nodeType: params.nodeType, scope: params.scope } : undefined
    ).then((r) => r as ExperimentsOverviewResult),

  getQueue: () => api.queue().then((r) => r as QueueResult),

  getPublish: (params?: { days?: number; from?: string; to?: string }) =>
    api.publish(
      params ? { days: params.days, from: params.from, to: params.to } : undefined
    ).then((r) => r as PublishMetricsResult),
};
