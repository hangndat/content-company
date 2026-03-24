import { useState, useEffect, useCallback } from "react";
import { experimentService } from "../services/experimentService";
import type { ExperimentReport } from "../models/experiment";
import type { ExperimentMeta } from "../services/experimentService";

export function useExperimentDetail(id: string | undefined) {
  const [meta, setMeta] = useState<ExperimentMeta | null>(null);
  const [data, setData] = useState<ExperimentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      setMeta(null);
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [m, r] = await Promise.all([
        experimentService.getExperiment(id),
        experimentService.getExperimentReport(id, 30),
      ]);
      setMeta(m);
      setData(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const start = useCallback(async () => {
    if (!id) return;
    try {
      await experimentService.startExperiment(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start");
    }
  }, [id, load]);

  const pause = useCallback(async () => {
    if (!id) return;
    try {
      await experimentService.pauseExperiment(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to pause");
    }
  }, [id, load]);

  const complete = useCallback(async () => {
    if (!id) return;
    try {
      await experimentService.completeExperiment(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to complete");
    }
  }, [id, load]);

  const promote = useCallback(
    async (armId?: string) => {
      if (!id) return;
      try {
        await experimentService.promoteExperiment(id, armId ? { armId } : undefined);
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to promote");
      }
    },
    [id, load]
  );

  return {
    meta,
    data,
    loading,
    error,
    reload: load,
    start,
    pause,
    complete,
    promote,
  };
}
