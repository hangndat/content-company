import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button, Descriptions, Form, Table, Tag, Tooltip, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { ProForm, ProFormSelect } from "@ant-design/pro-components";
import { jobService } from "@/features/ops/services/jobService";
import type { JobListItem } from "@/features/ops/models/job";
import { StatusTag } from "@/features/ops/components/StatusTag";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { AppPageHeader } from "@/shared/components/AppPageHeader";
import { ErrorState } from "@/shared/components/ErrorState";
import { PageShell } from "@/shared/components/PageShell";
import { PageToolbar } from "@/shared/components/PageToolbar";
import { PageTableCard } from "@/shared/components/PageTableCard";
import { formatJobDuration } from "@/features/ops/utils/formatJobDuration";

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "pending", label: "Chờ" },
  { value: "processing", label: "Đang chạy" },
  { value: "review_required", label: "Chờ duyệt" },
  { value: "completed", label: "Hoàn thành" },
  { value: "failed", label: "Thất bại" },
];

const SOURCE_TYPE_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "rss", label: "rss" },
  { value: "webhook", label: "webhook" },
  { value: "manual", label: "manual" },
  { value: "api", label: "api" },
  { value: "trend", label: "trend" },
  { value: "trend_aggregate", label: "trend_aggregate" },
];

function scoreCell(topic: number | null, review: number | null) {
  if (topic == null && review == null) {
    return <Typography.Text type="secondary">—</Typography.Text>;
  }
  const t = topic != null ? Number(topic).toFixed(2) : "—";
  const r = review != null ? Number(review).toFixed(2) : "—";
  return (
    <Tooltip title={`Topic: ${t} · Review: ${r}`}>
      <Typography.Text code style={{ fontSize: 12 }}>
        T {t} · R {r}
      </Typography.Text>
    </Tooltip>
  );
}

export default function JobsListPage() {
  useDocumentTitle("Danh sách job");
  const [filterForm] = Form.useForm<{ status: string; sourceType: string }>();
  const [items, setItems] = useState<JobListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [sourceType, setSourceType] = useState<string>("");

  useEffect(() => {
    filterForm.setFieldsValue({ status, sourceType });
  }, [status, sourceType, filterForm]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * pageSize;
      const res = await jobService.listJobs({
        limit: pageSize,
        offset,
        status: status || undefined,
        sourceType: sourceType || undefined,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được danh sách job.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, status, sourceType]);

  useEffect(() => {
    load();
  }, [load]);

  const columns = [
    {
      title: "Job ID",
      dataIndex: "id",
      key: "id",
      width: 108,
      fixed: "left" as const,
      render: (id: string) => <Link to={`/jobs/${id}`}>{id.slice(0, 8)}…</Link>,
    },
    {
      title: "Trend / chủ đề",
      key: "trendPreview",
      ellipsis: true,
      render: (_: unknown, row: JobListItem) => {
        if (row.sourceType !== "trend_aggregate") {
          return <Typography.Text type="secondary">—</Typography.Text>;
        }
        const n = row.trendCandidateCount;
        const topic = row.trendTopTopic?.trim();
        if (n == null || n === 0) {
          return (
            <Typography.Text type="secondary">{n === 0 ? "0 chủ đề" : "—"}</Typography.Text>
          );
        }
        const short = topic
          ? topic.length > 48
            ? `${topic.slice(0, 46)}…`
            : topic
          : `${n} chủ đề`;
        return (
          <Tooltip title="Mở dòng để xem đủ trace, điểm, thời lượng…">
            <span>
              <Tag color="blue" style={{ marginInlineEnd: 8 }}>
                {n}
              </Tag>
              <Typography.Text ellipsis style={{ maxWidth: 280 }}>
                {short}
              </Typography.Text>
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 128,
      render: (s: string) => <StatusTag status={s} />,
    },
    {
      title: "Quyết định",
      dataIndex: "decision",
      key: "decision",
      width: 128,
      render: (d: string | null) =>
        d ? <StatusTag status={d} /> : <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: "Nguồn",
      dataIndex: "sourceType",
      key: "sourceType",
      width: 120,
      render: (t: string) =>
        t === "trend_aggregate" ? <Tag color="purple">trend</Tag> : <Tag>{t}</Tag>,
    },
    {
      title: "Tạo lúc",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 148,
      render: (v: string) => (v ? new Date(v).toLocaleString("vi-VN") : "—"),
    },
  ];

  if (error) {
    return (
      <PageShell>
        <ErrorState message={error} onRetry={load} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <AppPageHeader
        title="Job"
        description="Theo dõi từng lần chạy pipeline. Bảng gọn: mở rộng dòng để xem trace, điểm, retry, thời lượng. Lọc theo trạng thái / nguồn, phân trang server."
      />
      <PageToolbar>
        <ProForm<{ status: string; sourceType: string }>
          form={filterForm}
          layout="inline"
          submitter={false}
          onValuesChange={(_, all) => {
            setStatus(all.status ?? "");
            setSourceType(all.sourceType ?? "");
            setPage(1);
          }}
        >
          <ProFormSelect
            name="status"
            label="Trạng thái"
            options={STATUS_OPTIONS}
            fieldProps={{ style: { minWidth: 180 }, "aria-label": "Lọc trạng thái job" }}
            allowClear={false}
          />
          <ProFormSelect
            name="sourceType"
            label="Nguồn"
            options={SOURCE_TYPE_OPTIONS}
            fieldProps={{ style: { minWidth: 200 }, "aria-label": "Lọc loại nguồn job" }}
            allowClear={false}
          />
        </ProForm>
        <Button icon={<ReloadOutlined />} onClick={() => load()} loading={loading} aria-label="Làm mới danh sách job">
          Làm mới
        </Button>
      </PageToolbar>
      <PageTableCard>
        <Table<JobListItem>
          dataSource={items}
          columns={columns}
          rowKey="id"
          loading={loading}
          expandable={{
            expandedRowRender: (row) => (
              <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 2 }} style={{ marginBottom: 0 }}>
                <Descriptions.Item label="Job ID" span={2}>
                  <Typography.Text copyable>{row.id}</Typography.Text>
                </Descriptions.Item>
                <Descriptions.Item label="Trace ID" span={2}>
                  <Typography.Text copyable={{ text: row.traceId }}>{row.traceId}</Typography.Text>
                </Descriptions.Item>
                <Descriptions.Item label="Chủ đề (trend)">
                  {row.sourceType === "trend_aggregate" && row.trendTopTopic?.trim() ? (
                    <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>
                      {row.trendTopTopic}
                    </Typography.Paragraph>
                  ) : (
                    <Typography.Text type="secondary">—</Typography.Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Số topic (trend)">
                  {row.trendCandidateCount != null ? row.trendCandidateCount : "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Điểm (T / R)">
                  {scoreCell(row.topicScore, row.reviewScore)}
                </Descriptions.Item>
                <Descriptions.Item label="Retry">{row.retryCount}</Descriptions.Item>
                <Descriptions.Item label="Thời lượng">
                  {formatJobDuration(row.createdAt, row.completedAt, row.status)}
                </Descriptions.Item>
                <Descriptions.Item label="Hoàn thành" span={2}>
                  {row.completedAt ? new Date(row.completedAt).toLocaleString("vi-VN") : "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Chi tiết" span={2}>
                  <Link to={`/jobs/${row.id}`}>Mở trang chi tiết →</Link>
                </Descriptions.Item>
              </Descriptions>
            ),
            rowExpandable: () => true,
          }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `${t} job`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          scroll={{ x: 900 }}
          locale={{ emptyText: "Không có job nào." }}
        />
      </PageTableCard>
    </PageShell>
  );
}
