import type { Env } from "../config/env.js";

export type LangfuseUsageSummary = {
  totalTokens: number | null;
  totalCostUsd: number | null;
  observationCount: number | null;
};

export function langfuseObservabilityEnabled(env: Env): boolean {
  return Boolean(env.LANGFUSE_PUBLIC_KEY && env.LANGFUSE_SECRET_KEY);
}

/** URL operators open in the browser (may differ from LANGFUSE_HOST when orchestrator runs in Docker). */
export function langfusePublicUiUrl(env: Env): string | null {
  if (!langfuseObservabilityEnabled(env)) return null;
  return env.LANGFUSE_UI_PUBLIC_URL ?? env.LANGFUSE_HOST;
}

function metricsAuthHeader(env: Env): string {
  const pk = env.LANGFUSE_PUBLIC_KEY ?? "";
  const sk = env.LANGFUSE_SECRET_KEY ?? "";
  return `Basic ${Buffer.from(`${pk}:${sk}`).toString("base64")}`;
}

/**
 * Best-effort aggregate from Langfuse metrics API. Returns null if Langfuse is off or the request fails.
 */
export async function fetchLangfuseUsageSummary(
  env: Env,
  range: { from: Date; to: Date }
): Promise<LangfuseUsageSummary | null> {
  if (!langfuseObservabilityEnabled(env)) return null;

  const base = env.LANGFUSE_HOST.replace(/\/$/, "");
  const query = {
    view: "observations",
    metrics: [
      { measure: "totalTokens", aggregation: "sum" },
      { measure: "totalCost", aggregation: "sum" },
      { measure: "count", aggregation: "sum" },
    ],
    fromTimestamp: range.from.toISOString(),
    toTimestamp: range.to.toISOString(),
  };

  const url = `${base}/api/public/metrics?query=${encodeURIComponent(JSON.stringify(query))}`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: metricsAuthHeader(env),
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: Record<string, unknown>[] };
    const row = body.data?.[0];
    if (!row || typeof row !== "object") return null;

    const num = (v: unknown): number | null =>
      typeof v === "number" && Number.isFinite(v) ? v : null;

    const pick = (...keys: string[]): number | null => {
      for (const k of keys) {
        const v = num((row as Record<string, unknown>)[k]);
        if (v != null) return v;
      }
      return null;
    };

    return {
      totalTokens: pick("sum_totalTokens", "totalTokens", "sumTotalTokens"),
      totalCostUsd: pick("sum_totalCost", "totalCost", "sumTotalCost"),
      observationCount: pick("sum_count", "count", "sumCount"),
    };
  } catch {
    return null;
  }
}
