/**
 * Dashboard types — verify against orchestrator/src/dashboard/* payloads.
 */

export interface Semantics {
  cohortBy?: string;
  reviewScoreScale?: string;
  smoothedCtrFormula?: string;
  approveRateBase?: string;
}

// orchestrator/src/dashboard/summary.ts getDashboardSummary()
export interface DashboardSummary {
  generatedAt: string;
  timeRange: { from: string; to: string };
  semantics?: Semantics;
  jobs: {
    created: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    approved: number;
    reviewRequired: number;
    rejected: number;
    retryCountGT0: number;
    avgProcessingMs: number | null;
  };
  publish: {
    success: number;
    failed: number;
    duplicateBlocked?: number | null;
  };
  queue: {
    waiting: number;
    active: number;
    delayed: number;
    failed: number;
    completed: number;
    paused: number;
  } | null;
}

// orchestrator/src/dashboard/job-trends.ts
export interface JobTrendPoint {
  date: string;
  created: number;
  completed: number;
  failed: number;
  approved: number;
  reviewRequired: number;
  rejected: number;
}

export interface JobTrendsResult {
  series: JobTrendPoint[];
  semantics?: Semantics;
}

// orchestrator/src/dashboard/topics.ts
export interface TopicPerformanceItem {
  topicKey: string;
  topicSignature: string;
  avgCtr: number;
  sampleCount: number;
  avgReviewScore: number | null;
}

export interface TopicsResult {
  items: TopicPerformanceItem[];
  semantics?: Semantics;
}

// orchestrator/src/dashboard/prompts.ts getPromptPerformance()
export interface PromptPerformanceItem {
  type: string;
  version: number;
  isActive: boolean;
  jobsCount: number;
  approvedCount: number;
  reviewRequiredCount: number;
  rejectedCount: number;
  approveRate: number | null;
  avgReviewScore: number | null;
  smoothedCtr: number | null;
  experimentUsageCount?: number;
}

export interface PromptsResult {
  items: PromptPerformanceItem[];
  semantics?: Semantics;
}

// orchestrator/src/dashboard/channels.ts
export interface ChannelPerformanceItem {
  channelId: string;
  jobsCount: number;
  approvedCount: number;
  publishSuccess: number;
  publishFailed: number;
  impressions: number;
  views: number;
  clicks: number;
  smoothedCtr: number | null;
}

export interface ChannelsResult {
  items: ChannelPerformanceItem[];
  semantics?: Semantics;
}

// orchestrator/src/dashboard/publish.ts
export interface PublishByDay {
  date: string;
  success: number;
  failed: number;
}

export interface PublishByChannel {
  channelId: string;
  success: number;
  failed: number;
}

export interface PublishMetricsResult {
  byDay: PublishByDay[];
  byChannel: PublishByChannel[];
  total: { success: number; failed: number };
  semantics?: Semantics;
}

export interface QueueResult {
  queue: {
    waiting: number;
    active: number;
    delayed: number;
    failed: number;
    completed: number;
    paused: number;
  } | null;
  semantics?: { note?: string };
}
