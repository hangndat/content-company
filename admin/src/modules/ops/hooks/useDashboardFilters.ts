import { useState, useCallback } from "react";
import type { DashboardFilters } from "../components/DashboardFilterBar";

const DEFAULT_FILTERS: DashboardFilters = {
  days: 7,
  granularity: "day",
};

export function useDashboardFilters() {
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);

  const updateFilters = useCallback((f: DashboardFilters) => {
    setFilters((prev) => ({ ...prev, ...f }));
  }, []);

  const apiParams = {
    days: filters.days ?? 7,
    from: filters.from,
    to: filters.to,
    granularity: filters.granularity ?? "day",
  };

  return { filters, setFilters: updateFilters, apiParams };
}
