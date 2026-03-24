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
  return res.json();
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

export async function fetchPost<T>(
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
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
    fetchApi<any>(`/dashboard/summary`, p as Record<string, string | number>),
  jobTrends: (p?: { days?: number; from?: string; to?: string; granularity?: string }) =>
    fetchApi<any>(`/dashboard/job-trends`, p as Record<string, string | number>),
  queue: () => fetchApi<any>(`/dashboard/queue`),
  publish: (p?: { days?: number; from?: string; to?: string }) =>
    fetchApi<any>(`/dashboard/publish`, p as Record<string, string | number>),
  topics: (p?: { days?: number; limit?: number; sortBy?: string; sortOrder?: string }) =>
    fetchApi<any>(`/dashboard/topics`, p as Record<string, string | number>),
  channels: (p?: { days?: number; limit?: number }) =>
    fetchApi<any>(`/dashboard/channels`, p as Record<string, string | number>),
  prompts: (p?: { type?: string; days?: number; limit?: number }) =>
    fetchApi<any>(`/dashboard/prompts`, p as Record<string, string | number>),
  experiments: (p?: { status?: string; nodeType?: string; scope?: string }) =>
    fetchApi<any>(`/dashboard/experiments`, p as Record<string, string | number>),
  experiment: (id: string) => fetchApi<any>(`/experiments/${id}`),
  experimentReport: (id: string, days?: number) =>
    fetchApi<any>(`/experiments/${id}/report`, days ? { days } : undefined),
  // Jobs
  jobs: (p?: { limit?: number; offset?: number; status?: string }) =>
    fetchApi<any>(`/jobs`, p as Record<string, string | number>),
  job: (id: string) => fetchApi<any>(`/jobs/${id}`),
  jobDetail: (id: string) => fetchApi<any>(`/jobs/${id}/detail`),
  approveJob: (id: string, body: { actor: string; reason?: string }) =>
    fetchPost<any>(`/jobs/${id}/approve`, body),
  rejectJob: (id: string, body: { actor: string; reason: string }) =>
    fetchPost<any>(`/jobs/${id}/reject`, body),
  replayJob: (id: string, body?: { fromStep?: string }) =>
    fetchPost<any>(`/jobs/${id}/replay`, body ?? {}),
  // Experiment actions
  startExperiment: (id: string) => fetchPost<{ id: string; status: string }>(`/experiments/${id}/start`),
  pauseExperiment: (id: string) => fetchPost<{ id: string; status: string }>(`/experiments/${id}/pause`),
  completeExperiment: (id: string) => fetchPost<{ id: string; status: string }>(`/experiments/${id}/complete`),
  promoteExperiment: (id: string, body?: { armId?: string }) =>
    fetchPost<{ id: string; promoted: { armId: string; promptVersion: number } }>(
      `/experiments/${id}/promote`,
      body ?? undefined
    ),
  // Run job
  runJob: (body: {
    sourceType: "rss" | "webhook" | "manual" | "api";
    rawItems: Array<{ title: string; body?: string; url?: string }>;
    publishPolicy: "auto" | "review_only" | "manual_only";
    channel: { id: string; type: "blog" | "social" | "affiliate"; metadata?: Record<string, unknown> };
    topicHint?: string;
  }) =>
    fetchPost<{ jobId: string; status: string; traceId?: string; createdAt?: string }>(
      `/jobs/content/run`,
      body
    ),
  runTrendJob: (body: {
    domain?: string;
    rawItems: Array<{
      title: string;
      body?: string;
      url?: string;
      sourceId?: string;
      id?: string;
      publishedAt?: string;
    }>;
    channel?: { id: string; type: "blog" | "social" | "affiliate"; metadata?: Record<string, unknown> };
  }) =>
    fetchPost<{ jobId: string; status: string; traceId?: string; createdAt?: string }>(`/jobs/trend/run`, body),
  // Published content list
  published: (p?: { limit?: number; offset?: number; status?: string; from?: string; to?: string }) =>
    fetchApi<{ items: unknown[]; total: number }>(`/published`, p as Record<string, string | number>),
  // Prompts (for Settings)
  promptsList: () => fetchApi<Record<string, unknown[]>>(`/prompts`),
  promptsByType: (type: string) =>
    fetchApi<Array<{ id: string; version: number; content: string; isActive: boolean; createdAt: string }>>(
      `/prompts/${type}`
    ),
  createPrompt: (type: string, body: { content: string; setActive?: boolean }) =>
    fetchPost<{ id: string; type: string; version: number; isActive: boolean }>(`/prompts/${type}`, body),
  activatePrompt: (type: string, body: { version: number }) =>
    fetchPost<{ type: string; version: number }>(`/prompts/${type}/activate`, body),
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
