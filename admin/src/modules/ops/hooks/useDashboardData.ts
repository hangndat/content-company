import { useState, useEffect, useCallback } from "react";
import { dashboardService } from "../services/dashboardService";

export function useDashboardData(params: {
  days?: number;
  from?: string;
  to?: string;
  granularity?: "day" | "hour";
}) {
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof dashboardService.getSummary>> | null>(null);
  const [trends, setTrends] = useState<Awaited<ReturnType<typeof dashboardService.getJobTrends>> | null>(null);
  const [queue, setQueue] = useState<Awaited<ReturnType<typeof dashboardService.getQueue>> | null>(null);
  const [publish, setPublish] = useState<Awaited<ReturnType<typeof dashboardService.getPublish>> | null>(null);
  const [topics, setTopics] = useState<Awaited<ReturnType<typeof dashboardService.getTopics>> | null>(null);
  const [prompts, setPrompts] = useState<Awaited<ReturnType<typeof dashboardService.getPrompts>> | null>(null);
  const [experiments, setExperiments] = useState<Awaited<ReturnType<typeof dashboardService.getExperiments>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, t, q, p, top, prom, exp] = await Promise.all([
        dashboardService.getSummary({
          days: params.days ?? 1,
          from: params.from,
          to: params.to,
        }),
        dashboardService.getJobTrends({
          days: params.days ?? 7,
          from: params.from,
          to: params.to,
          granularity: params.granularity ?? "day",
        }),
        dashboardService.getQueue(),
        dashboardService.getPublish({
          days: params.days ?? 7,
          from: params.from,
          to: params.to,
        }),
        dashboardService.getTopics({
          days: params.days ?? 7,
          limit: 20,
          sortBy: "avgCtr",
        }),
        dashboardService.getPrompts({ type: "writer", days: 14, limit: 20 }),
        dashboardService.getExperiments({ status: "running" }),
      ]);
      setSummary(s);
      setTrends(t);
      setQueue(q);
      setPublish(p);
      setTopics(top);
      setPrompts(prom);
      setExperiments(exp);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [params.days, params.from, params.to, params.granularity]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    summary,
    trends,
    queue,
    publish,
    topics,
    prompts,
    experiments,
    loading,
    error,
    reload: load,
  };
}
