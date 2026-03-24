import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Form, Table, Button, Alert, Space } from "antd";
import { RunJobModal } from "@/features/ops/components/RunJobModal";
import { ReloadOutlined } from "@ant-design/icons";
import { ProForm, ProFormText } from "@ant-design/pro-components";
import { api } from "@/lib/api";
import type { ColumnsType } from "antd/es/table";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { AppPageHeader } from "@/shared/components/AppPageHeader";
import { PageShell } from "@/shared/components/PageShell";
import { PageToolbar } from "@/shared/components/PageToolbar";
import { PageTableCard } from "@/shared/components/PageTableCard";

type Row = {
  id: string;
  fingerprint: string;
  trendDomain: string;
  sourceJobId: string;
  candidateIndex: number;
  topicTitle: string;
  createdAt: string;
  articleCount: number;
};

type FilterForm = { domain?: string };

export default function TrendTopicsPage() {
  useDocumentTitle("Thư viện topic");
  const [filterForm] = Form.useForm<FilterForm>();
  const [data, setData] = useState<{ items: Row[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ limit: 50, offset: 0 });
  const [domainFilter, setDomainFilter] = useState<string | undefined>();
  const [runContentOpen, setRunContentOpen] = useState(false);
  const [runContentCtx, setRunContentCtx] = useState<{ jobId: string; topicIndex: number } | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.trendTopics({
        limit: pagination.limit,
        offset: pagination.offset,
        ...(domainFilter ? { domain: domainFilter } : {}),
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
  }, [pagination.limit, pagination.offset, domainFilter]);

  const columns: ColumnsType<Row> = [
    {
      title: "Topic",
      dataIndex: "topicTitle",
      key: "topicTitle",
      ellipsis: true,
      render: (t: string, r) => (
        <Link to={`/trend-topics/${r.id}`} title={t}>
          {t}
        </Link>
      ),
    },
    {
      title: "Bài",
      dataIndex: "articleCount",
      key: "articleCount",
      width: 72,
      align: "right",
      render: (n: number) => (n > 0 ? n : "—"),
    },
    { title: "Domain", dataIndex: "trendDomain", key: "trendDomain", width: 120 },
    { title: "Idx", dataIndex: "candidateIndex", key: "candidateIndex", width: 56 },
    {
      title: "Fingerprint",
      dataIndex: "fingerprint",
      key: "fingerprint",
      width: 128,
      ellipsis: true,
      render: (f: string) => <code style={{ fontSize: 11 }}>{f.slice(0, 16)}…</code>,
    },
    {
      title: "Lúc ghi",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 168,
      render: (d: string) => new Date(d).toLocaleString("vi-VN"),
    },
    {
      title: "Job",
      key: "job",
      width: 112,
      render: (_, r) => (
        <Link to={`/jobs/${r.sourceJobId}`} style={{ fontSize: 12 }}>
          {r.sourceJobId.slice(0, 8)}…
        </Link>
      ),
    },
    {
      title: "Nội dung",
      key: "runContent",
      width: 148,
      fixed: "right",
      render: (_, r) => (
        <Button
          type="link"
          size="small"
          style={{ padding: 0 }}
          onClick={() => {
            setRunContentCtx({ jobId: r.sourceJobId, topicIndex: r.candidateIndex });
            setRunContentOpen(true);
          }}
        >
          Chạy pipeline
        </Button>
      ),
    },
  ];

  return (
    <PageShell>
      <AppPageHeader
        title="Thư viện topic"
        description="Mỗi dòng là một topic đã ghi nhận khi trend job hoàn thành. Danh sách sắp theo số bài (giảm dần), rồi mới theo thời gian ghi. Nút Chạy pipeline mở form job nội dung với đúng job trend và chỉ số topic; hoặc vào chi tiết topic / job."
      />
      <PageToolbar>
        <ProForm<FilterForm>
          form={filterForm}
          layout="inline"
          submitter={false}
          onValuesChange={(_, all) => setDomainFilter(all.domain?.trim() || undefined)}
          style={{ flex: 1 }}
        >
          <ProFormText name="domain" label="Domain" fieldProps={{ placeholder: "vd. sports-vn", allowClear: true }} />
        </ProForm>
        <Space>
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

      <RunJobModal
        open={runContentOpen}
        onClose={() => {
          setRunContentOpen(false);
          setRunContentCtx(null);
        }}
        initialTrendJobId={runContentCtx?.jobId}
        initialTopicIndex={runContentCtx?.topicIndex ?? null}
      />
    </PageShell>
  );
}
