import { Row, Col, Table, Typography } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { useDashboardFilters } from "@/features/ops/hooks/useDashboardFilters";
import { useDashboardData } from "@/features/ops/hooks/useDashboardData";
import { useRecentJobs } from "@/features/ops/hooks/useRecentJobs";
import { DashboardFilterBar } from "@/features/ops/components/DashboardFilterBar";
import { SummaryStatCard } from "@/features/ops/components/SummaryStatCard";
import { JobTrendChart } from "@/features/ops/components/JobTrendChart";
import { QueueOverviewCard } from "@/features/ops/components/QueueOverviewCard";
import { PublishOverviewCard } from "@/features/ops/components/PublishOverviewCard";
import { ChannelPerformanceCard } from "@/features/ops/components/ChannelPerformanceCard";
import { TopicPerformanceTable } from "@/features/ops/components/TopicPerformanceTable";
import { PromptPerformanceTable } from "@/features/ops/components/PromptPerformanceTable";
import { ExperimentTable } from "@/features/ops/components/ExperimentTable";
import { SemanticsNote } from "@/features/ops/components/SemanticsNote";
import { LangfuseObservabilityCard } from "@/features/ops/components/LangfuseObservabilityCard";
import { StatusTag } from "@/features/ops/components/StatusTag";
import { formatDurationMs } from "@/shared/utils/formatters";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { AppPageHeader } from "@/shared/components/AppPageHeader";
import { ErrorState } from "@/shared/components/ErrorState";
import { PageShell } from "@/shared/components/PageShell";
import { PageCenteredSpin } from "@/shared/components/PageCenteredSpin";
import { PageSectionCard } from "@/shared/components/PageSectionCard";
import { PageTableCard } from "@/shared/components/PageTableCard";

const { Text } = Typography;

export default function OpsDashboardPage() {
  useDocumentTitle("Tổng quan");
  const navigate = useNavigate();
  const { filters, setFilters: updateFilters, apiParams } = useDashboardFilters();
  const {
    summary,
    trends,
    queue,
    publish,
    topics,
    prompts,
    experiments,
    channels,
    loading,
    error,
    reload,
  } = useDashboardData(apiParams);
  const { items: recentJobs, loading: jobsLoading } = useRecentJobs();

  const handleGranularityChange = (g: "day" | "hour") => {
    updateFilters({ ...filters, granularity: g });
  };

  if (loading && !summary) {
    return (
      <PageShell>
        <PageCenteredSpin tip="Đang tải báo cáo vận hành…" />
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
        title="Tổng quan vận hành"
        description="Theo dõi sức khỏe pipeline nội dung AI: job, hàng đợi BullMQ, xuất bản, hiệu suất topic/prompt, thử nghiệm đa nhánh và liên kết Langfuse."
      />
      <DashboardFilterBar
        filters={filters}
        onFiltersChange={updateFilters}
        onRefresh={reload}
        loading={loading}
      />

      {summary?.semantics && <SemanticsNote semantics={summary.semantics} variant="text" />}

      <LangfuseObservabilityCard days={apiParams.days ?? 7} />

      <section aria-label="Chỉ số tổng hợp">
        <Text strong style={{ display: "block", marginBottom: 8 }}>
          Chỉ số job &amp; xuất bản
        </Text>
        <Row gutter={[12, 12]}>
          <Col xs={12} sm={8} md={6} lg={4}>
            <SummaryStatCard title="Job tạo mới" value={summary?.jobs?.created} loading={loading} />
          </Col>
          <Col xs={12} sm={8} md={6} lg={4}>
            <SummaryStatCard title="Chờ xử lý" value={summary?.jobs?.pending} loading={loading} />
          </Col>
          <Col xs={12} sm={8} md={6} lg={4}>
            <SummaryStatCard title="Đang chạy" value={summary?.jobs?.processing} loading={loading} />
          </Col>
          <Col xs={12} sm={8} md={6} lg={4}>
            <SummaryStatCard title="Hoàn thành" value={summary?.jobs?.completed} loading={loading} />
          </Col>
          <Col xs={12} sm={8} md={6} lg={4}>
            <SummaryStatCard title="Thất bại" value={summary?.jobs?.failed} loading={loading} />
          </Col>
          <Col xs={12} sm={8} md={6} lg={4}>
            <SummaryStatCard title="Đã duyệt" value={summary?.jobs?.approved} loading={loading} />
          </Col>
          <Col xs={12} sm={8} md={6} lg={4}>
            <SummaryStatCard title="Cần review" value={summary?.jobs?.reviewRequired} loading={loading} />
          </Col>
          <Col xs={12} sm={8} md={6} lg={4}>
            <SummaryStatCard title="Từ chối" value={summary?.jobs?.rejected} loading={loading} />
          </Col>
          <Col xs={12} sm={8} md={6} lg={4}>
            <SummaryStatCard title="Publish OK" value={summary?.publish?.success} loading={loading} />
          </Col>
          <Col xs={12} sm={8} md={6} lg={4}>
            <SummaryStatCard title="Publish lỗi" value={summary?.publish?.failed} loading={loading} />
          </Col>
          <Col xs={12} sm={8} md={6} lg={4}>
            <SummaryStatCard title="Hàng đợi chờ" value={queue?.queue?.waiting} loading={loading} />
          </Col>
          <Col xs={12} sm={8} md={6} lg={4}>
            <SummaryStatCard
              title="TB xử lý"
              value={
                summary?.jobs?.avgProcessingMs != null
                  ? formatDurationMs(summary.jobs.avgProcessingMs)
                  : undefined
              }
              loading={loading}
            />
          </Col>
        </Row>
      </section>

      <JobTrendChart
        series={trends?.series ?? []}
        granularity={(filters.granularity as "day" | "hour") ?? "day"}
        onGranularityChange={handleGranularityChange}
        loading={loading}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <QueueOverviewCard
            queue={queue?.queue ?? null}
            loading={loading}
            note={queue?.semantics?.note}
          />
        </Col>
        <Col xs={24} lg={12}>
          <PublishOverviewCard data={publish} loading={loading} />
        </Col>
      </Row>

      <ChannelPerformanceCard data={channels ?? null} loading={loading} />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <PageSectionCard title="Topic nổi bật (theo CTR)">
            <TopicPerformanceTable dataSource={topics?.items ?? []} loading={loading} />
          </PageSectionCard>
        </Col>
        <Col xs={24} lg={12}>
          <PageSectionCard title="Hiệu suất prompt (writer)">
            <PromptPerformanceTable dataSource={prompts?.items ?? []} loading={loading} />
          </PageSectionCard>
        </Col>
      </Row>

      <PageTableCard
        title="Job gần đây"
        extra={
          <Link to="/jobs" style={{ fontSize: 14 }}>
            Xem tất cả
          </Link>
        }
      >
        <Table
          dataSource={recentJobs}
          rowKey="id"
          size="small"
          loading={jobsLoading}
          pagination={false}
          locale={{ emptyText: "Chưa có job nào." }}
          columns={[
            {
              title: "Job ID",
              dataIndex: "id",
              render: (id: string) => (
                <Link to={`/jobs/${id}`}>{id.slice(0, 12)}…</Link>
              ),
            },
            {
              title: "Trạng thái",
              dataIndex: "status",
              width: 120,
              render: (s: string) => <StatusTag status={s} />,
            },
            {
              title: "Quyết định",
              dataIndex: "decision",
              width: 140,
              render: (d: string | null) => (d ? <StatusTag status={d} /> : <Text type="secondary">—</Text>),
            },
            {
              title: "Tạo lúc",
              dataIndex: "createdAt",
              width: 180,
              render: (v: string) => (v ? new Date(v).toLocaleString("vi-VN") : "—"),
            },
          ]}
        />
      </PageTableCard>

      <PageTableCard title="Thử nghiệm đang chạy">
        <ExperimentTable
          dataSource={experiments?.items ?? []}
          loading={loading}
          onViewDetail={(id) => navigate(`/experiments/${id}`)}
        />
      </PageTableCard>
    </PageShell>
  );
}
