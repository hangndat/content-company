import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Form, Table, Button, Alert, Tag, Typography, Space } from "antd";
import { LineChartOutlined, ReloadOutlined } from "@ant-design/icons";
import { ProForm, ProFormSelect, ProFormText } from "@ant-design/pro-components";
import { api } from "@/lib/api";
import type { ColumnsType } from "antd/es/table";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { AppPageHeader } from "@/shared/components/AppPageHeader";
import { PageShell } from "@/shared/components/PageShell";
import { PageToolbar } from "@/shared/components/PageToolbar";
import { PageTableCard } from "@/shared/components/PageTableCard";
import { stripHtml } from "@/shared/utils/stripHtml";
import { RunTrendJobModal } from "@/features/ops/components/RunTrendJobModal";

type Row = {
  id: string;
  dedupeKey: string;
  trendDomain: string;
  url: string | null;
  title: string;
  bodyPreview: string | null;
  sourceId: string | null;
  trendContentSourceId: string | null;
  rssSource: { id: string; label: string | null; feedUrl: string } | null;
  firstSeenAt: string;
  lastSeenAt: string;
  processedForTrendAt: string | null;
};

type FilterForm = {
  domain?: string;
  q?: string;
  processed?: "all" | "yes" | "no";
  trendContentSourceId?: string;
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
    trendContentSourceId?: string;
  }>({ processed: "all" });
  const [trendModalOpen, setTrendModalOpen] = useState(false);
  const [rssSourceOptions, setRssSourceOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.trendSources({ limit: 100, offset: 0 });
        if (!cancelled) {
          setRssSourceOptions(
            res.items.map((s) => ({
              value: s.id,
              label: s.label?.trim() || s.feedUrl.slice(0, 48) + (s.feedUrl.length > 48 ? "…" : ""),
            }))
          );
        }
      } catch {
        if (!cancelled) setRssSourceOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
        ...(filters.trendContentSourceId ? { trendContentSourceId: filters.trendContentSourceId } : {}),
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
  }, [pagination.limit, pagination.offset, filters.domain, filters.q, filters.processed, filters.trendContentSourceId]);

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
      title: "Nguồn (host)",
      key: "source",
      width: 100,
      render: (_, r) => r.sourceId ?? "—",
    },
    {
      title: "RSS đăng ký",
      key: "rssReg",
      width: 200,
      ellipsis: true,
      render: (_, r) =>
        r.rssSource ? (
          <Typography.Text ellipsis={{ tooltip: `${r.rssSource.label ?? ""}\n${r.rssSource.feedUrl}` }}>
            {r.rssSource.label?.trim() || r.rssSource.feedUrl.slice(0, 40)}
            {r.rssSource.feedUrl.length > 40 && !r.rssSource.label?.trim() ? "…" : ""}
          </Typography.Text>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
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
        description={
          <span>
            Bài được ghi (upsert) khi chạy job trend; cột «Đã chạy trend» = bài đã qua bước normalize của trend trong cửa sổ
            dedup. Cột «RSS đăng ký» = feed trong{" "}
            <Link to="/trend-sources">Nguồn RSS</Link> nếu trend chạy từ đó (hoặc có nhập ID nguồn). Luồng:{" "}
            <Link to="/trend-sources">Nguồn RSS</Link> / <strong>Chạy job trend</strong> →{" "}
            <Link to="/trend-topics">Thư viện topic</Link> → pipeline nội dung.
          </span>
        }
      />
      <PageToolbar spread>
        <ProForm<FilterForm>
          form={filterForm}
          layout="inline"
          initialValues={{ processed: "all" }}
          onFinish={async (v) => {
            setFilters({
              domain: v.domain?.trim() || undefined,
              q: v.q?.trim() || undefined,
              processed: v.processed ?? "all",
              trendContentSourceId: v.trendContentSourceId?.trim() || undefined,
            });
            setPagination((p) => ({ ...p, offset: 0 }));
            return true;
          }}
          submitter={false}
          style={{ flexWrap: "wrap", rowGap: 8 }}
        >
          <ProFormText
            name="q"
            label="Tìm"
            fieldProps={{ placeholder: "Tiêu đề hoặc URL", allowClear: true }}
          />
          <ProFormText name="domain" label="Domain" fieldProps={{ placeholder: "sports-vn", allowClear: true }} />
          <ProFormSelect
            name="trendContentSourceId"
            label="Nguồn RSS"
            width={220}
            showSearch
            allowClear
            options={rssSourceOptions}
            fieldProps={{
              placeholder: "Tất cả",
              optionFilterProp: "label",
            }}
          />
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
        <Space wrap style={{ flexShrink: 0 }}>
          <Button
            type="primary"
            icon={<LineChartOutlined />}
            onClick={() => setTrendModalOpen(true)}
            aria-label="Chạy job trend từ bài đã crawl"
          >
            Chạy job trend
          </Button>
          <Button icon={<ReloadOutlined />} onClick={load}>
            Làm mới
          </Button>
        </Space>
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
          scroll={{ x: 1280 }}
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
      <RunTrendJobModal open={trendModalOpen} onClose={() => setTrendModalOpen(false)} />
    </PageShell>
  );
}
