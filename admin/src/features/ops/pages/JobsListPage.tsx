import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Form, Table, Tag, Tooltip, Typography } from "antd";
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

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "pending", label: "Chờ" },
  { value: "processing", label: "Đang chạy" },
  { value: "completed", label: "Hoàn thành" },
  { value: "failed", label: "Thất bại" },
];

export default function JobsListPage() {
  useDocumentTitle("Danh sách job");
  const [filterForm] = Form.useForm<{ status: string }>();
  const [items, setItems] = useState<JobListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    filterForm.setFieldsValue({ status });
  }, [status, filterForm]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await jobService.listJobs({ limit: 50, offset: 0, status: status || undefined });
      setItems(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được danh sách job.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const columns = [
    {
      title: "Job ID",
      dataIndex: "id",
      key: "id",
      width: 120,
      render: (id: string) => <Link to={`/jobs/${id}`}>{id.slice(0, 8)}…</Link>,
    },
    {
      title: "Trend / chủ đề (xem trước)",
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
          ? topic.length > 72
            ? `${topic.slice(0, 70)}…`
            : topic
          : "(xem chi tiết)";
        return (
          <Tooltip title={topic || `${n} chủ đề`}>
            <span>
              <Tag color="blue" style={{ marginInlineEnd: 8 }}>
                {n} chủ đề
              </Tag>
              <Typography.Text>{short}</Typography.Text>
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (s: string) => <StatusTag status={s} />,
    },
    {
      title: "Quyết định",
      dataIndex: "decision",
      key: "decision",
      width: 140,
      render: (d: string | null) =>
        d ? <StatusTag status={d} /> : <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: "Nguồn",
      dataIndex: "sourceType",
      key: "sourceType",
      width: 140,
      render: (t: string) =>
        t === "trend_aggregate" ? <Tag color="purple">trend</Tag> : <Tag>{t}</Tag>,
    },
    {
      title: "Tạo lúc",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (v: string) => (v ? new Date(v).toLocaleString("vi-VN") : "—"),
    },
    {
      title: "Hoàn thành",
      dataIndex: "completedAt",
      key: "completedAt",
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
        description="Theo dõi từng lần chạy pipeline: nội dung thủ công hoặc gom trend. Lọc theo trạng thái và mở chi tiết để duyệt / replay."
      />
      <PageToolbar>
        <ProForm<{ status: string }>
          form={filterForm}
          layout="inline"
          submitter={false}
          onValuesChange={(_, all) => setStatus(all.status ?? "")}
        >
          <ProFormSelect
            name="status"
            label="Trạng thái"
            options={STATUS_OPTIONS}
            fieldProps={{ style: { minWidth: 180 }, "aria-label": "Lọc trạng thái job" }}
            allowClear={false}
          />
        </ProForm>
      </PageToolbar>
      <PageTableCard>
        <Table
          dataSource={items}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `${t} job` }}
          scroll={{ x: "max-content" }}
          locale={{ emptyText: "Không có job nào." }}
        />
      </PageTableCard>
    </PageShell>
  );
}
