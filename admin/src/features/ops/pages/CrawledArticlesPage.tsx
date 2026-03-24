import { useEffect, useState } from "react";
import { Form, Table, Button, Alert, Tag, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { ProForm, ProFormSelect, ProFormText } from "@ant-design/pro-components";
import { api } from "@/lib/api";
import type { ColumnsType } from "antd/es/table";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { AppPageHeader } from "@/shared/components/AppPageHeader";
import { PageShell } from "@/shared/components/PageShell";
import { PageToolbar } from "@/shared/components/PageToolbar";
import { PageTableCard } from "@/shared/components/PageTableCard";
import { stripHtml } from "@/shared/utils/stripHtml";

type Row = {
  id: string;
  dedupeKey: string;
  trendDomain: string;
  url: string | null;
  title: string;
  bodyPreview: string | null;
  sourceId: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  processedForTrendAt: string | null;
};

type FilterForm = {
  domain?: string;
  q?: string;
  processed?: "all" | "yes" | "no";
};

export default function CrawledArticlesPage() {
  useDocumentTitle("Bài đã crawl");
  const [filterForm] = Form.useForm<FilterForm>();
  const [data, setData] = useState<{ items: Row[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ limit: 50, offset: 0 });
  const [filters, setFilters] = useState<{
    domain?: string;
    q?: string;
    processed: "all" | "yes" | "no";
  }>({ processed: "all" });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.crawledArticles({
        limit: pagination.limit,
        offset: pagination.offset,
        ...(filters.domain ? { domain: filters.domain } : {}),
        ...(filters.q?.trim() ? { q: filters.q.trim() } : {}),
        processed: filters.processed,
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được dữ liệu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [pagination.limit, pagination.offset, filters.domain, filters.q, filters.processed]);

  const columns: ColumnsType<Row> = [
    {
      title: "Tiêu đề",
      dataIndex: "title",
      key: "title",
      ellipsis: true,
      width: 280,
      render: (t: string, r) =>
        r.url ? (
          <a href={r.url} target="_blank" rel="noreferrer" title={t}>
            {t}
          </a>
        ) : (
          <Typography.Text ellipsis={{ tooltip: t }}>{t}</Typography.Text>
        ),
    },
    {
      title: "Domain",
      dataIndex: "trendDomain",
      key: "trendDomain",
      width: 110,
    },
    {
      title: "Nguồn",
      key: "source",
      width: 100,
      render: (_, r) => r.sourceId ?? "—",
    },
    {
      title: "Trend",
      key: "proc",
      width: 96,
      render: (_, r) =>
        r.processedForTrendAt ? (
          <Tag color="green">Đã chạy</Tag>
        ) : (
          <Tag color="default">Chưa</Tag>
        ),
    },
    {
      title: "Lần cuối thấy",
      dataIndex: "lastSeenAt",
      key: "lastSeenAt",
      width: 148,
      render: (d: string) => new Date(d).toLocaleString("vi-VN"),
    },
    {
      title: "dedupe_key",
      dataIndex: "dedupeKey",
      key: "dedupeKey",
      width: 120,
      ellipsis: true,
      render: (k: string) => (
        <Typography.Text code copyable={{ text: k }} style={{ fontSize: 11 }}>
          {k.slice(0, 14)}…
        </Typography.Text>
      ),
    },
    {
      title: "Xem nhanh",
      key: "preview",
      ellipsis: true,
      render: (_, r) => (
        <Typography.Text type="secondary" ellipsis={{ tooltip: true }} style={{ maxWidth: 220 }}>
          {stripHtml(r.bodyPreview ?? "") || "—"}
        </Typography.Text>
      ),
    },
  ];

  return (
    <PageShell>
      <AppPageHeader
        title="Bài đã crawl"
        description="Nguồn tin upsert khi gọi trend job; cột Trend = đã đưa qua normalize thành công trong cửa sổ dedup."
      />
      <PageToolbar>
        <ProForm<FilterForm>
          form={filterForm}
          layout="inline"
          initialValues={{ processed: "all" }}
          onFinish={async (v) => {
            setFilters({
              domain: v.domain?.trim() || undefined,
              q: v.q?.trim() || undefined,
              processed: v.processed ?? "all",
            });
            setPagination((p) => ({ ...p, offset: 0 }));
            return true;
          }}
          submitter={false}
          style={{ flex: 1, flexWrap: "wrap", rowGap: 8 }}
        >
          <ProFormText
            name="q"
            label="Tìm"
            fieldProps={{ placeholder: "Tiêu đề hoặc URL", allowClear: true }}
          />
          <ProFormText name="domain" label="Domain" fieldProps={{ placeholder: "sports-vn", allowClear: true }} />
          <ProFormSelect
            name="processed"
            label="Đã chạy trend"
            width={160}
            options={[
              { value: "all", label: "Tất cả" },
              { value: "yes", label: "Đã chạy" },
              { value: "no", label: "Chưa chạy" },
            ]}
          />
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Lọc
            </Button>
          </Form.Item>
        </ProForm>
        <Button icon={<ReloadOutlined />} onClick={load}>
          Làm mới
        </Button>
      </PageToolbar>
      {error ? (
        <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />
      ) : null}
      <PageTableCard>
        <Table<Row>
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
            onChange: (page, pageSize) => {
              const ps = pageSize ?? pagination.limit;
              setPagination({ limit: ps, offset: (page - 1) * ps });
            },
          }}
        />
      </PageTableCard>
    </PageShell>
  );
}
