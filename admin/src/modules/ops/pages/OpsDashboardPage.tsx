import { Row, Col, Card, Alert, Spin, Table } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { useDashboardFilters } from "../hooks/useDashboardFilters";
import { useDashboardData } from "../hooks/useDashboardData";
import { useRecentJobs } from "../hooks/useRecentJobs";
import { DashboardFilterBar } from "../components/DashboardFilterBar";
import { SummaryStatCard } from "../components/SummaryStatCard";
import { JobTrendChart } from "../components/JobTrendChart";
import { QueueOverviewCard } from "../components/QueueOverviewCard";
import { PublishOverviewCard } from "../components/PublishOverviewCard";
import { TopicPerformanceTable } from "../components/TopicPerformanceTable";
import { PromptPerformanceTable } from "../components/PromptPerformanceTable";
import { ExperimentTable } from "../components/ExperimentTable";
import { SemanticsNote } from "../components/SemanticsNote";
import { formatDurationMs } from "../../../shared/utils/formatters";

export default function OpsDashboardPage() {
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
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h2>Ops Dashboard</h2>
        <DashboardFilterBar
          filters={filters}
          onFiltersChange={updateFilters}
          onRefresh={reload}
          loading={loading}
        />
      </div>

      {summary?.semantics && (
        <SemanticsNote semantics={summary.semantics} variant="text" />
      )}

      {/* Section 1: Summary cards */}
      <Row gutter={[16, 16]}>
          <Col xs={12} sm={8} md={4}>
            <SummaryStatCard title="Jobs Created" value={summary?.jobs?.created} loading={loading} />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <SummaryStatCard title="Pending" value={summary?.jobs?.pending} loading={loading} />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <SummaryStatCard title="Processing" value={summary?.jobs?.processing} loading={loading} />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <SummaryStatCard title="Completed" value={summary?.jobs?.completed} loading={loading} />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <SummaryStatCard title="Failed" value={summary?.jobs?.failed} loading={loading} />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <SummaryStatCard title="Approved" value={summary?.jobs?.approved} loading={loading} />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <SummaryStatCard title="Review Required" value={summary?.jobs?.reviewRequired} loading={loading} />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <SummaryStatCard title="Rejected" value={summary?.jobs?.rejected} loading={loading} />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <SummaryStatCard
              title="Publish Success"
              value={summary?.publish?.success}
              loading={loading}
            />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <SummaryStatCard
              title="Publish Failed"
              value={summary?.publish?.failed}
              loading={loading}
            />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <SummaryStatCard
              title="Queue Waiting"
              value={queue?.queue?.waiting}
              loading={loading}
            />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <SummaryStatCard
              title="Avg Processing"
              value={
                summary?.jobs?.avgProcessingMs != null
                  ? formatDurationMs(summary.jobs.avgProcessingMs)
                  : undefined
              }
              loading={loading}
            />
          </Col>
        </Row>

      {/* Section 2: Job trends */}
      <JobTrendChart
        series={trends?.series ?? []}
        granularity={(filters.granularity as "day" | "hour") ?? "day"}
        onGranularityChange={handleGranularityChange}
        loading={loading}
      />

      {/* Section 3: Queue & Publish */}
      <Row gutter={16}>
        <Col span={12}>
          <QueueOverviewCard
            queue={queue?.queue ?? null}
            loading={loading}
            note={queue?.semantics?.note}
          />
        </Col>
        <Col span={12}>
          <PublishOverviewCard data={publish} loading={loading} />
        </Col>
      </Row>

      {/* Section 4 & 5: Topics & Prompts */}
      <Row gutter={16}>
        <Col span={12}>
          <Card title="Top Topics (by CTR)">
            <TopicPerformanceTable
              dataSource={topics?.items ?? []}
              loading={loading}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Prompt Performance (writer)">
            <PromptPerformanceTable
              dataSource={prompts?.items ?? []}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      {/* Section 6: Recent Jobs */}
      <Card title="Recent Jobs" extra={<Link to="/jobs">View all</Link>}>
        <Table
          dataSource={recentJobs}
          rowKey="id"
          size="small"
          loading={jobsLoading}
          pagination={false}
          columns={[
            {
              title: "Job ID",
              dataIndex: "id",
              render: (id: string) => (
                <a onClick={() => navigate(`/jobs/${id}`)} style={{ cursor: "pointer" }}>
                  {id.slice(0, 12)}…
                </a>
              ),
            },
            { title: "Status", dataIndex: "status", width: 100 },
            { title: "Decision", dataIndex: "decision", width: 120 },
            {
              title: "Created",
              dataIndex: "createdAt",
              width: 160,
              render: (v: string) => (v ? new Date(v).toLocaleString() : "—"),
            },
          ]}
        />
      </Card>

      {/* Section 7: Running experiments */}
      <Card title="Running Experiments">
        <ExperimentTable
          dataSource={experiments?.items ?? []}
          loading={loading}
          onViewDetail={(id) => navigate(`/experiments/${id}`)}
        />
      </Card>
    </div>
  );
}
