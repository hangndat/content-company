import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Form, Table, Button, Alert, Space, Tag, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { ProForm, ProFormSelect } from "@ant-design/pro-components";
import { api } from "@/lib/api";
import type { ContentDraftListItem } from "@/features/ops/models/content-draft";
import type { ColumnsType } from "antd/es/table";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { AppPageHeader } from "@/shared/components/AppPageHeader";
import { PageShell } from "@/shared/components/PageShell";
import { PageToolbar } from "@/shared/components/PageToolbar";
import { PageTableCard } from "@/shared/components/PageTableCard";
import { StatusTag } from "@/features/ops/components/StatusTag";
import { stripHtml } from "@/shared/utils/stripHtml";

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
];

type FilterForm = { status: string; sourceType: string };

export default function ContentDraftsPage() {
  useDocumentTitle("Draft (content pipeline)");
  const [searchParams, setSearchParams] = useSearchParams();
  const initialJobId = searchParams.get("jobId")?.trim() || undefined;

  const [filterForm] = Form.useForm<FilterForm>();
  const [data, setData] = useState<{ items: ContentDraftListItem[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ limit: 50, offset: 0 });
  const [status, setStatus] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [jobIdFilter, setJobIdFilter] = useState<string | undefined>(initialJobId);

  useEffect(() => {
    const q = searchParams.get("jobId")?.trim();
    setJobIdFilter(q || undefined);
  }, [searchParams]);

  useEffect(() => {
    filterForm.setFieldsValue({ status, sourceType });
  }, [status, sourceType, filterForm]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.contentDrafts({
        limit: pagination.limit,
        offset: pagination.offset,
        status: status || undefined,
        sourceType: sourceType || undefined,
        jobId: jobIdFilter,
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được danh sách draft.");
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, pagination.offset, status, sourceType, jobIdFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const clearJobFilter = () => {
    setJobIdFilter(undefined);
    searchParams.delete("jobId");
    setSearchParams(searchParams, { replace: true });
  };

  const columns: ColumnsType<ContentDraftListItem> = [
    {
      title: "Job",
      key: "job",
      width: 120,
      fixed: "left",
      render: (_, r) => (
        <Link to={`/jobs/${r.jobId}`} style={{ fontSize: 12 }}>
          {r.jobId.slice(0, 8)}…
        </Link>
      ),
    },
    {
      title: "Trạng thái job",
      key: "jobStatus",
      width: 128,
      render: (_, r) => <StatusTag status={r.job.status} />,
    },
    {
      title: "Nguồn",
      key: "src",
      width: 100,
      render: (_, r) => <Tag>{r.job.sourceType}</Tag>,
    },
    {
      title: "Outline (xem trước)",
      dataIndex: "outlinePreview",
      key: "outlinePreview",
      ellipsis: true,
      render: (t: string | null) =>
        t ? (
          <Typography.Text ellipsis={{ tooltip: t }} style={{ fontSize: 13 }}>
            {stripHtml(t)}
          </Typography.Text>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
    {
      title: "Draft (xem trước)",
      dataIndex: "bodyPreview",
      key: "bodyPreview",
      ellipsis: true,
      render: (t: string | null) =>
        t ? (
          <Typography.Text ellipsis={{ tooltip: stripHtml(t) }} style={{ fontSize: 13 }}>
            {stripHtml(t)}
          </Typography.Text>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
    {
      title: "Snapshot",
      key: "snap",
      width: 140,
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          {r.decision ? <StatusTag status={r.decision} /> : <Typography.Text type="secondary">—</Typography.Text>}
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            T {r.topicScore != null ? r.topicScore.toFixed(2) : "—"} · R{" "}
            {r.reviewScore != null ? r.reviewScore.toFixed(2) : "—"}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Cập nhật draft",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 168,
      render: (d: string) => new Date(d).toLocaleString("vi-VN"),
    },
    {
      title: "Draft ID",
      dataIndex: "id",
      key: "id",
      width: 100,
      render: (id: string) => (
        <Typography.Text copyable={{ text: id }} style={{ fontSize: 11 }}>
          {id.slice(0, 8)}…
        </Typography.Text>
      ),
    },
  ];

  return (
    <PageShell>
      <AppPageHeader
        title="Draft (content pipeline)"
        description="Bản ghi entity `content_draft` sau khi content graph hoàn thành. Xem đầy đủ outline/draft trên trang chi tiết job. Lọc theo job: thêm ?jobId=… trên URL hoặc từ link ở job detail."
      />
      <PageToolbar spread>
        <ProForm<FilterForm>
          form={filterForm}
          layout="inline"
          submitter={false}
          initialValues={{ status: "", sourceType: "" }}
          onValuesChange={(_, all) => {
            setStatus(all.status ?? "");
            setSourceType(all.sourceType ?? "");
            setPagination((p) => ({ ...p, offset: 0 }));
          }}
        >
          <ProFormSelect
            name="status"
            label="Trạng thái job"
            options={STATUS_OPTIONS}
            fieldProps={{ style: { minWidth: 170 } }}
            allowClear={false}
          />
          <ProFormSelect
            name="sourceType"
            label="Nguồn job"
            options={SOURCE_TYPE_OPTIONS}
            fieldProps={{ style: { minWidth: 160 } }}
            allowClear={false}
          />
        </ProForm>
        <Space style={{ flexShrink: 0 }}>
          {jobIdFilter ? (
            <Button onClick={clearJobFilter}>Bỏ lọc job</Button>
          ) : null}
          <Button icon={<ReloadOutlined />} onClick={load}>
            Làm mới
          </Button>
        </Space>
      </PageToolbar>
      {jobIdFilter ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={`Đang lọc theo job: ${jobIdFilter}`}
        />
      ) : null}
      {error ? (
        <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />
      ) : null}
      <PageTableCard>
        <Table<ContentDraftListItem>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={data?.items ?? []}
          scroll={{ x: 1100 }}
          pagination={{
            current: Math.floor(pagination.offset / pagination.limit) + 1,
            pageSize: pagination.limit,
            total: data?.total ?? 0,
            showSizeChanger: true,
            pageSizeOptions: [20, 50, 100],
            showTotal: (t) => `${t} draft`,
            onChange: (page, pageSize) => {
              const ps = pageSize ?? pagination.limit;
              setPagination({ limit: ps, offset: (page - 1) * ps });
            },
          }}
          locale={{ emptyText: "Chưa có draft nào (chỉ tạo sau khi content pipeline xong)." }}
        />
      </PageTableCard>
    </PageShell>
  );
}
