import { useState, useEffect, useCallback } from "react";
import { jobService } from "@/features/ops/services/jobService";
import type { JobListItem } from "@/features/ops/models/job";

export function useRecentJobs() {
  const [items, setItems] = useState<JobListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await jobService.listJobs({ limit: 10, offset: 0 });
      setItems(res.items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, reload: load };
}
