import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  App,
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { api } from "@/lib/api";
import type { ColumnsType } from "antd/es/table";
import { TREND_DOMAIN_OPTIONS } from "@/features/ops/constants/jobRunForm";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { AppPageHeader } from "@/shared/components/AppPageHeader";
import { PageShell } from "@/shared/components/PageShell";
import { PageToolbar } from "@/shared/components/PageToolbar";
import { PageTableCard } from "@/shared/components/PageTableCard";

type Row = {
  id: string;
  trendDomain: string;
  kind: string;
  label: string | null;
  feedUrl: string;
  enabled: boolean;
  lastFetchedAt: string | null;
  lastItemCount: number | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

type FormValues = {
  trendDomain: string;
  label?: string;
  feedUrl: string;
  enabled: boolean;
};

export default function TrendSourcesPage() {
  useDocumentTitle("Nguồn RSS (trend)");
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const [data, setData] = useState<{ items: Row[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ limit: 50, offset: 0 });
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm<FormValues>();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<Awaited<ReturnType<typeof api.previewTrendSource>> | null>(
    null
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.trendSources({
        limit: pagination.limit,
        offset: pagination.offset,
      });
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được danh sách nguồn.");
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, pagination.offset]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    form.setFieldsValue({
      trendDomain: "sports-vn",
      label: "",
      feedUrl: "",
      enabled: true,
    });
    setEditorOpen(true);
  };

  const openEdit = (row: Row) => {
    setEditingId(row.id);
    form.setFieldsValue({
      trendDomain: row.trendDomain,
      label: row.label ?? "",
      feedUrl: row.feedUrl,
      enabled: row.enabled,
    });
    setEditorOpen(true);
  };

  const submitEditor = async () => {
    try {
      const v = await form.validateFields();
      if (editingId) {
        await api.patchTrendSource(editingId, {
          trendDomain: v.trendDomain,
          label: v.label?.trim() || null,
          feedUrl: v.feedUrl.trim(),
          enabled: v.enabled,
        });
        message.success("Đã cập nhật nguồn.");
      } else {
        await api.createTrendSource({
          trendDomain: v.trendDomain,
          label: v.label?.trim() || null,
          feedUrl: v.feedUrl.trim(),
          enabled: v.enabled,
        });
        message.success("Đã tạo nguồn.");
      }
      setEditorOpen(false);
      await load();
    } catch (e) {
      if (e instanceof Error) message.error(e.message);
    }
  };

  const runPreview = async (id: string) => {
    setPreviewOpen(true);
    setPreviewData(null);
    setPreviewLoading(true);
    try {
      const p = await api.previewTrendSource(id, { itemLimit: 40 });
      setPreviewData(p);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Preview thất bại.");
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const runTrend = (row: Row) => {
    modal.confirm({
      title: "Chạy job trend từ RSS?",
      content: (
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          Lấy tối đa 40 bài từ feed, rồi gọi pipeline trend (ingest crawled_article + dedup như API thường).
          {row.lastError ? (
            <>
              <br />
              <Typography.Text type="warning">Lần trước: {row.lastError}</Typography.Text>
            </>
          ) : null}
        </Typography.Paragraph>
      ),
      okText: "Chạy",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          const r = await api.runTrendFromSource(row.id, { itemLimit: 40 });
          message.success(`Đã tạo trend job (${r.itemCount} bài từ RSS).`);
          navigate(`/jobs/${r.jobId}`);
          await load();
        } catch (e) {
          message.error(e instanceof Error ? e.message : "Chạy trend thất bại.");
          throw e;
        }
      },
    });
  };

  const columns: ColumnsType<Row> = [
    {
      title: "Nhãn",
      key: "label",
      ellipsis: true,
      render: (_, r) => r.label?.trim() || <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: "Domain",
      dataIndex: "trendDomain",
      key: "trendDomain",
      width: 120,
    },
    {
      title: "Feed URL",
      dataIndex: "feedUrl",
      key: "feedUrl",
      ellipsis: true,
      render: (u: string) => (
        <Typography.Link href={u} target="_blank" rel="noreferrer">
          {u.length > 56 ? `${u.slice(0, 54)}…` : u}
        </Typography.Link>
      ),
    },
    {
      title: "Bật",
      dataIndex: "enabled",
      key: "enabled",
      width: 72,
      render: (en: boolean) => (en ? <Tag color="green">Có</Tag> : <Tag>Tắt</Tag>),
    },
    {
      title: "Lần chạy",
      key: "last",
      width: 160,
      render: (_, r) => (
        <span style={{ fontSize: 12 }}>
          {r.lastFetchedAt ? new Date(r.lastFetchedAt).toLocaleString("vi-VN") : "—"}
          {r.lastItemCount != null ? (
            <>
              <br />
              <Typography.Text type="secondary">{r.lastItemCount} bài</Typography.Text>
            </>
          ) : null}
        </span>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 280,
      fixed: "right",
      render: (_, r) => (
        <Space size="small" wrap>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => void runPreview(r.id)}>
            Xem trước
          </Button>
          <Button
            type="link"
            size="small"
            icon={<ThunderboltOutlined />}
            disabled={!r.enabled}
            onClick={() => runTrend(r)}
          >
            Chạy trend
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>
            Sửa
          </Button>
          <Popconfirm title="Xóa nguồn này?" onConfirm={() => void handleDelete(r.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleDelete = async (id: string) => {
    try {
      await api.deleteTrendSource(id);
      message.success("Đã xóa.");
      await load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Xóa thất bại.");
    }
  };

  return (
    <PageShell>
      <AppPageHeader
        title="Nguồn RSS (trend)"
        description={
          <span>
            Đăng ký feed để fetch bài trên server và chạy job <strong>trend_aggregate</strong> mà không cần n8n.
            Dùng «Xem trước» để kiểm tra map nguồn (domain profile). Sau khi chạy, xem bài trong{" "}
            <Link to="/crawled-articles">Bài đã crawl</Link> và topic trong{" "}
            <Link to="/trend-topics">Thư viện topic</Link>.
          </span>
        }
      />
      <PageToolbar>
        <Space wrap>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Thêm nguồn RSS
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
            Làm mới
          </Button>
        </Space>
      </PageToolbar>
      {error ? <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} /> : null}
      <PageTableCard>
        <Table<Row>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={data?.items ?? []}
          scroll={{ x: 960 }}
          pagination={{
            current: Math.floor(pagination.offset / pagination.limit) + 1,
            pageSize: pagination.limit,
            total: data?.total ?? 0,
            showSizeChanger: true,
            pageSizeOptions: [20, 50, 100],
            onChange: (page, pageSize) => {
              const ps = pageSize ?? pagination.limit;
              setPagination({ limit: ps, offset: (page - 1) * ps });
            },
          }}
          locale={{ emptyText: "Chưa có nguồn nào. Thêm URL RSS và domain trend tương ứng." }}
        />
      </PageTableCard>

      <Modal
        title={editingId ? "Sửa nguồn RSS" : "Thêm nguồn RSS"}
        open={editorOpen}
        onCancel={() => setEditorOpen(false)}
        onOk={() => void submitEditor()}
        okText="Lưu"
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="trendDomain" label="Trend domain" rules={[{ required: true }]}>
            <Select options={[...TREND_DOMAIN_OPTIONS]} />
          </Form.Item>
          <Form.Item name="label" label="Nhãn (tuỳ chọn)">
            <Input placeholder="vd. VnExpress thể thao" allowClear />
          </Form.Item>
          <Form.Item
            name="feedUrl"
            label="URL feed (RSS/Atom)"
            rules={[
              { required: true, message: "Bắt buộc" },
              { type: "url", message: "Phải là URL hợp lệ" },
            ]}
          >
            <Input placeholder="https://…" />
          </Form.Item>
          <Form.Item name="enabled" label="Bật" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Xem trước RSS"
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={null}
        width={720}
        destroyOnClose
      >
        {previewLoading ? (
          <Typography.Paragraph>Đang tải feed…</Typography.Paragraph>
        ) : previewData ? (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Alert
              type={previewData.trendJobValidationOk ? "success" : "warning"}
              showIcon
              message={
                previewData.trendJobValidationOk
                  ? "Các mục đủ điều kiện gửi trend job (theo domain profile)."
                  : "Một số mục có thể bị từ chối khi chạy trend — xem chi tiết validation."
              }
            />
            <Typography.Text type="secondary">
              {previewData.itemCount} bài dùng được · bỏ qua body ngắn: {previewData.skippedShortBody} · thiếu URL:{" "}
              {previewData.skippedNoUrl} · chưa map được sourceId: {previewData.unresolvedSourceCount}
            </Typography.Text>
            <Table
              size="small"
              pagination={false}
              rowKey={(_, i) => String(i)}
              dataSource={previewData.items}
              columns={[
                { title: "Tiêu đề", dataIndex: "title", key: "title", ellipsis: true, width: 200 },
                {
                  title: "sourceId",
                  dataIndex: "resolvedSourceId",
                  key: "sid",
                  width: 100,
                  render: (s: string) =>
                    s === "unknown" ? <Tag color="red">unknown</Tag> : <Tag>{s}</Tag>,
                },
                {
                  title: "URL",
                  dataIndex: "url",
                  key: "url",
                  ellipsis: true,
                  render: (u: string) =>
                    u ? (
                      <Typography.Link href={u} target="_blank" rel="noreferrer">
                        mở
                      </Typography.Link>
                    ) : (
                      "—"
                    ),
                },
              ]}
            />
          </Space>
        ) : null}
      </Modal>
    </PageShell>
  );
}
