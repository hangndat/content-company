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
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
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
};
