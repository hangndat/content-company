import { useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { isAgentType } from "@/features/ops/constants/agents";
import { useExperimentFilters } from "@/features/ops/hooks/useExperimentFilters";
import { useExperimentList } from "@/features/ops/hooks/useExperimentList";
import { experimentService } from "@/features/ops/services/experimentService";
import { ExperimentFilterBar } from "@/features/ops/components/ExperimentFilterBar";
import { ExperimentTable } from "@/features/ops/components/ExperimentTable";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { AppPageHeader } from "@/shared/components/AppPageHeader";
import { ErrorState } from "@/shared/components/ErrorState";
import { PageShell } from "@/shared/components/PageShell";
import { PageToolbar } from "@/shared/components/PageToolbar";
import { PageTableCard } from "@/shared/components/PageTableCard";
import { PageCenteredSpin } from "@/shared/components/PageCenteredSpin";

export default function ExperimentsPage() {
  useDocumentTitle("Thử nghiệm");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { filters, setFilters: updateFilters, apiParams } = useExperimentFilters();
  const { data, loading, error, reload } = useExperimentList(apiParams);

  useEffect(() => {
    const nt = searchParams.get("nodeType");
    if (nt && isAgentType(nt)) {
      updateFilters({ nodeType: nt });
    }
  }, [searchParams, updateFilters]);
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
      // surfaced on next reload / user retries
    }
  };

  const handlePause = async (id: string) => {
    try {
      await experimentService.pauseExperiment(id);
      await reload();
    } catch {
      // surfaced on next reload
    }
  };

  if (loading && !data) {
    return (
      <PageShell>
        <PageCenteredSpin tip="Đang tải danh sách thử nghiệm…" />
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <ErrorState message={error} onRetry={reload} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <AppPageHeader
        title="Thử nghiệm (multi-arm)"
        description="So sánh prompt / cấu hình theo cohort; theo dõi CTR, review score và guard. Khởi chạy hoặc tạm dừng từ bảng, xem chi tiết để promote nhánh thắng."
      />
      <PageToolbar>
        <ExperimentFilterBar filters={filters} onFiltersChange={updateFilters} />
      </PageToolbar>
      <PageTableCard>
        <ExperimentTable
          dataSource={items}
          loading={loading}
          onViewDetail={(id) => navigate(`/experiments/${id}`)}
          onStart={handleStart}
          onPause={handlePause}
        />
      </PageTableCard>
    </PageShell>
  );
}
