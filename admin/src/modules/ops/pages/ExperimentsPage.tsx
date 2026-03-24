import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Spin } from "antd";
import { useExperimentFilters } from "../hooks/useExperimentFilters";
import { useExperimentList } from "../hooks/useExperimentList";
import { experimentService } from "../services/experimentService";
import { ExperimentFilterBar } from "../components/ExperimentFilterBar";
import { ExperimentTable } from "../components/ExperimentTable";

export default function ExperimentsPage() {
  const navigate = useNavigate();
  const { filters, setFilters: updateFilters, apiParams } = useExperimentFilters();
  const { data, loading, error, reload } = useExperimentList(apiParams);
  const items = useMemo(() => {
    let list = data?.items ?? [];
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter((e) => e.name.toLowerCase().includes(q));
    }
    return list;
  }, [data?.items, filters.search]);

  const handleStart = async (id: string) => {
    try {
      await experimentService.startExperiment(id);
      await reload();
    } catch {
      // Error surfaced via reload/error state
    }
  };

  const handlePause = async (id: string) => {
    try {
      await experimentService.pauseExperiment(id);
      await reload();
    } catch {
      // Error surfaced via reload/error state
    }
  };

  if (loading && !data) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        type="error"
        message={error}
        showIcon
        action={
          <a onClick={reload} style={{ marginLeft: 8 }}>
            Retry
          </a>
        }
      />
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2>Experiments</h2>
        <ExperimentFilterBar filters={filters} onFiltersChange={updateFilters} />
      </div>
      <ExperimentTable
        dataSource={items}
        loading={loading}
        onViewDetail={(id) => navigate(`/experiments/${id}`)}
        onStart={handleStart}
        onPause={handlePause}
      />
    </div>
  );
}
