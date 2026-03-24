import { useState, useCallback } from "react";
import type { ExperimentFilters } from "@/features/ops/components/ExperimentFilterBar";

export function useExperimentFilters() {
  const [filters, setFilters] = useState<ExperimentFilters>({
    runningOnly: false,
  });

  const updateFilters = useCallback((f: ExperimentFilters) => {
    setFilters((prev) => ({ ...prev, ...f }));
  }, []);

  const apiParams = {
    status: filters.runningOnly ? "running" : filters.status,
    nodeType: filters.nodeType,
    scope: filters.scope,
  };

  return { filters, setFilters: updateFilters, apiParams };
}
