import type {
  DashboardSummary,
  JobTrendsResult,
  PublishMetricsResult,
  TopicsResult,
  ChannelsResult,
  PromptsResult,
  QueueResult,
} from "@/features/ops/models/dashboard";
import type {
  ExperimentsOverviewResult,
  ExperimentMeta,
  ExperimentReport,
  ExperimentStatusActionResponse,
  ExperimentPromoteResponse,
} from "@/features/ops/models/experiment";
import type {
  JobsListResponse,
  JobDetailResponse,
  JobSummaryResponse,
  RunJobApiResponse,
  JobReplayResponse,
  ApproveJobResponse,
  RejectJobResponse,
  PublishedListResponse,
  TrendCandidate,
} from "@/features/ops/models/job";
import type { AgentIoFeedResult } from "@/features/ops/models/agent-io";
import type { ContentDraftsListResponse } from "@/features/ops/models/content-draft";

const API_BASE = "/v1";

function getAuthHeaders(): HeadersInit {
  const apiKey = (import.meta as { env?: { VITE_API_KEY?: string } }).env?.VITE_API_KEY;
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (apiKey) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${apiKey}`;
  }
  return headers;
}

export async function fetchApi<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, String(v));
      }
    });
  }
  const res = await fetch(url.toString(), { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

function formatApiError(status: number, statusText: string, parsed: unknown): string {
  const errObj = parsed as { error?: { message?: string; details?: unknown } } | null;
  let msg = errObj?.error?.message ?? `API ${status}: ${statusText}`;
  const d = errObj?.error?.details;
  if (d && typeof d === "object") {
    const s = JSON.stringify(d);
    if (s.length > 0) msg = `${msg}: ${s.length > 600 ? `${s.slice(0, 600)}…` : s}`;
  }
  return msg;
}

export async function fetchPost<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  const url = `${window.location.origin}${API_BASE}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: getAuthHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  if (!res.ok) throw new Error(formatApiError(res.status, res.statusText, parsed));
  return parsed as T;
}

export const api = {
  summary: (p?: { days?: number; from?: string; to?: string }) =>
    fetchApi<DashboardSummary>(`/dashboard/summary`, p as Record<string, string | number>),
  jobTrends: (p?: { days?: number; from?: string; to?: string; granularity?: string }) =>
    fetchApi<JobTrendsResult>(`/dashboard/job-trends`, p as Record<string, string | number>),
  queue: () => fetchApi<QueueResult>(`/dashboard/queue`),
  publish: (p?: { days?: number; from?: string; to?: string }) =>
    fetchApi<PublishMetricsResult>(`/dashboard/publish`, p as Record<string, string | number>),
  topics: (p?: { days?: number; limit?: number; sortBy?: string; sortOrder?: string }) =>
    fetchApi<TopicsResult>(`/dashboard/topics`, p as Record<string, string | number>),
  channels: (p?: { days?: number; limit?: number }) =>
    fetchApi<ChannelsResult>(`/dashboard/channels`, p as Record<string, string | number>),
  prompts: (p?: { type?: string; days?: number; limit?: number }) =>
    fetchApi<PromptsResult>(`/dashboard/prompts`, p as Record<string, string | number>),
  agentIo: (p: { step: string; days?: number; limit?: number }) =>
    fetchApi<AgentIoFeedResult>(`/dashboard/agent-io`, p as Record<string, string | number>),
  experiments: (p?: { status?: string; nodeType?: string; scope?: string }) =>
    fetchApi<ExperimentsOverviewResult>(`/dashboard/experiments`, p as Record<string, string | number>),
  experiment: (id: string) => fetchApi<ExperimentMeta>(`/experiments/${id}`),
  experimentReport: (id: string, days?: number) =>
    fetchApi<ExperimentReport>(`/experiments/${id}/report`, days ? { days } : undefined),
  jobs: (p?: { limit?: number; offset?: number; status?: string; sourceType?: string }) =>
    fetchApi<JobsListResponse>(`/jobs`, p as Record<string, string | number>),
  job: (id: string) => fetchApi<JobSummaryResponse>(`/jobs/${id}`),
  jobDetail: (id: string) => fetchApi<JobDetailResponse>(`/jobs/${id}/detail`),
  contentDrafts: (p?: {
    limit?: number;
    offset?: number;
    status?: string;
    sourceType?: string;
    jobId?: string;
  }) => fetchApi<ContentDraftsListResponse>(`/content-drafts`, p as Record<string, string | number>),
  approveJob: (id: string, body: { actor: string; reason?: string }) =>
    fetchPost<ApproveJobResponse>(`/jobs/${id}/approve`, body),
  rejectJob: (id: string, body: { actor: string; reason: string }) =>
    fetchPost<RejectJobResponse>(`/jobs/${id}/reject`, body),
  replayJob: (id: string, body?: { fromStep?: string }) =>
    fetchPost<JobReplayResponse>(`/jobs/${id}/replay`, body ?? {}),
  startExperiment: (id: string) => fetchPost<ExperimentStatusActionResponse>(`/experiments/${id}/start`),
  pauseExperiment: (id: string) => fetchPost<ExperimentStatusActionResponse>(`/experiments/${id}/pause`),
  completeExperiment: (id: string) => fetchPost<ExperimentStatusActionResponse>(`/experiments/${id}/complete`),
  promoteExperiment: (id: string, body?: { armId?: string }) =>
    fetchPost<ExperimentPromoteResponse>(`/experiments/${id}/promote`, body ?? undefined),
  runJob: (body: {
    sourceType: "rss" | "webhook" | "manual" | "api" | "trend";
    rawItems?: Array<{ title: string; body?: string; url?: string }>;
    trendJobId?: string;
    topicIndex?: number;
    publishPolicy: "auto" | "review_only" | "manual_only";
    channel: { id: string; type: "blog" | "social" | "affiliate"; metadata?: Record<string, unknown> };
    topicHint?: string;
  }) => fetchPost<RunJobApiResponse>(`/jobs/content/run`, body),
  trendTopics: (p?: { domain?: string; limit?: number; offset?: number }) =>
    fetchApi<{
      items: Array<{
        id: string;
        fingerprint: string;
        trendDomain: string;
        sourceJobId: string;
        candidateIndex: number;
        topicTitle: string;
        createdAt: string;
        articleCount: number;
      }>;
      total: number;
    }>(`/trend-topics`, p as Record<string, string | number>),
  trendTopic: (id: string) =>
    fetchApi<{
      observation: {
        id: string;
        fingerprint: string;
        trendDomain: string;
        sourceJobId: string;
        candidateIndex: number;
        topicTitle: string;
        createdAt: string;
      };
      job: { id: string; status: string; completedAt: string | null };
      candidate: TrendCandidate | null;
    }>(`/trend-topics/${id}`),
  crawledArticles: (p?: {
    domain?: string;
    q?: string;
    processed?: "all" | "yes" | "no";
    limit?: number;
    offset?: number;
  }) =>
    fetchApi<{
      items: Array<{
        id: string;
        dedupeKey: string;
        trendDomain: string;
        url: string | null;
        title: string;
        bodyPreview: string | null;
        sourceId: string | null;
        firstSeenAt: string;
        lastSeenAt: string;
        processedForTrendAt: string | null;
      }>;
      total: number;
    }>(`/crawled-articles`, p as Record<string, string | number>),
  runTrendJob: (body: {
    domain?: string;
    skipArticleDedup?: boolean;
    rawItems: Array<{
      title: string;
      body?: string;
      url?: string;
      sourceId?: string;
      id?: string;
      publishedAt?: string;
    }>;
    channel?: { id: string; type: "blog" | "social" | "affiliate"; metadata?: Record<string, unknown> };
  }) => fetchPost<RunJobApiResponse>(`/jobs/trend/run`, body),
  published: (p?: { limit?: number; offset?: number; status?: string; from?: string; to?: string }) =>
    fetchApi<PublishedListResponse>(`/published`, p as Record<string, string | number>),
  promptsList: () => fetchApi<Record<string, unknown[]>>(`/prompts`),
  promptsByType: (type: string) =>
    fetchApi<Array<{ id: string; version: number; content: string; isActive: boolean; createdAt: string }>>(
      `/prompts/${type}`
    ),
  createPrompt: (type: string, body: { content: string; setActive?: boolean }) =>
    fetchPost<{ id: string; type: string; version: number; isActive: boolean }>(`/prompts/${type}`, body),
  activatePrompt: (type: string, body: { version: number }) =>
    fetchPost<{ type: string; version: number }>(`/prompts/${type}/activate`, body),
  dryRunPrompt: (
    type: string,
    body: { sourceJobId: string; snapshotStep: string; promptContent: string }
  ) => fetchPost<{ output: string; traceId: string }>(`/prompts/${type}/dry-run`, body),
  observability: (p?: { days?: number }) =>
    fetchApi<{
      enabled: boolean;
      uiUrl: string | null;
      days: number;
      usage: {
        totalTokens: number | null;
        totalCostUsd: number | null;
        observationCount: number | null;
      } | null;
    }>(`/settings/observability`, p as Record<string, string | number>),
};
