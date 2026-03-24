import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Table, Card, Select, DatePicker, Space, Button } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { api } from "../../../api";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

type PublishedItem = {
  id: string;
  jobId: string;
  channelId: string;
  status: string;
  publishRef: string | null;
  publishedAt: string | null;
  createdAt: string;
  job: {
    id: string;
    status: string;
    decision: string | null;
    createdAt: string;
  } | null;
};

export default function PostsPage() {
  const [data, setData] = useState<{ items: PublishedItem[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ limit: 50, offset: 0 });
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {
        limit: pagination.limit,
        offset: pagination.offset,
      };
      if (statusFilter) params.status = statusFilter;
      if (dateRange[0]) params.from = dateRange[0].format("YYYY-MM-DD");
      if (dateRange[1]) params.to = dateRange[1].format("YYYY-MM-DD");
      const result = await api.published(params);
      setData(result as { items: PublishedItem[]; total: number });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [pagination.limit, pagination.offset, statusFilter, dateRange]);

  const columns: ColumnsType<PublishedItem> = [
    {
      title: "Job ID",
      dataIndex: "jobId",
      key: "jobId",
      render: (jobId: string) => (
        <Link to={`/jobs/${jobId}`} target="_blank">
          {jobId.slice(0, 8)}…
        </Link>
      ),
    },
    {
      title: "Channel",
      dataIndex: "channelId",
      key: "channelId",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
    },
    {
      title: "Published At",
      dataIndex: "publishedAt",
      key: "publishedAt",
      render: (v: string | null) => (v ? new Date(v).toLocaleString() : "—"),
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (v: string) => new Date(v).toLocaleString(),
    },
    {
      title: "Publish Ref",
      dataIndex: "publishRef",
      key: "publishRef",
      ellipsis: true,
      render: (v: string | null) => v ?? "—",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2>Published Content</h2>
      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <Select
            placeholder="Status"
            allowClear
            style={{ width: 140 }}
            onChange={(v) => setStatusFilter(v)}
            options={[
              { value: "published", label: "Published" },
              { value: "failed", label: "Failed" },
            ]}
          />
          <DatePicker.RangePicker
            onChange={(dates) => setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null])}
          />
          <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
            Refresh
          </Button>
        </Space>
        {error && <div style={{ color: "#ff4d4f", marginBottom: 8 }}>{error}</div>}
        <Table<PublishedItem>
          columns={columns}
          dataSource={data?.items ?? []}
          rowKey="id"
          loading={loading}
          pagination={{
            total: data?.total ?? 0,
            pageSize: pagination.limit,
            current: Math.floor(pagination.offset / pagination.limit) + 1,
            showSizeChanger: true,
            showTotal: (t) => `Total ${t} items`,
            onChange: (page, pageSize) => {
              setPagination({
                limit: pageSize ?? 50,
                offset: ((page ?? 1) - 1) * (pageSize ?? 50),
              });
            },
          }}
        />
      </Card>
    </div>
  );
}
