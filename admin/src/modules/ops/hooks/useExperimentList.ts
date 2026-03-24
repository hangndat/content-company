import { useState, useEffect, useCallback } from "react";
import { dashboardService } from "../services/dashboardService";

export function useExperimentList(params: {
  status?: string;
  nodeType?: string;
  scope?: string;
}) {
  const [data, setData] = useState<Awaited<ReturnType<typeof dashboardService.getExperiments>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardService.getExperiments(params);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [params.status, params.nodeType, params.scope]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
