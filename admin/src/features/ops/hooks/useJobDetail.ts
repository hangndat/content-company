import { useState, useEffect, useCallback } from "react";
import { jobService } from "@/features/ops/services/jobService";
import type { JobDetailResponse } from "@/features/ops/models/job";

export function useJobDetail(id: string | undefined) {
  const [detail, setDetail] = useState<JobDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      setDetail(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const d = await jobService.getJobDetail(id);
      setDetail(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load job");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const approve = useCallback(
    async (actor: string, reason?: string) => {
      if (!id) return;
      try {
        await jobService.approveJob(id, { actor, reason });
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to approve");
      }
    },
    [id, load]
  );

  const reject = useCallback(
    async (actor: string, reason: string) => {
      if (!id) return;
      try {
        await jobService.rejectJob(id, { actor, reason });
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to reject");
      }
    },
    [id, load]
  );

  const replay = useCallback(
    async (fromStep?: string) => {
      if (!id) return;
      try {
        await jobService.replayJob(id, fromStep ? { fromStep } : undefined);
        await load();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to replay";
        setError(msg);
        throw e;
      }
    },
    [id, load]
  );

  return {
    detail,
    loading,
    error,
    reload: load,
    approve,
    reject,
    replay,
  };
}
