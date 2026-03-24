import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Form, Table, Button, Alert } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { ProForm, ProFormSelect, ProFormDateRangePicker } from "@ant-design/pro-components";
import { api } from "@/lib/api";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { StatusTag } from "@/features/ops/components/StatusTag";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { AppPageHeader } from "@/shared/components/AppPageHeader";
import { PageShell } from "@/shared/components/PageShell";
import { PageToolbar } from "@/shared/components/PageToolbar";
import { PageTableCard } from "@/shared/components/PageTableCard";

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

type FilterFormValues = {
  status?: string;
  range?: [dayjs.Dayjs, dayjs.Dayjs] | null;
};

export default function PostsPage() {
  useDocumentTitle("Bài đăng");
  const [filterForm] = Form.useForm<FilterFormValues>();
  const [data, setData] = useState<{ items: PublishedItem[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ limit: 50, offset: 0 });
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);

  useEffect(() => {
    filterForm.setFieldsValue({
      status: statusFilter,
      range:
        dateRange[0] && dateRange[1] ? [dateRange[0], dateRange[1]] : undefined,
    });
  }, [statusFilter, dateRange, filterForm]);

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
      setError(err instanceof Error ? err.message : "Không tải được dữ liệu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [pagination.limit, pagination.offset, statusFilter, dateRange]);

  const handleFilterChange = (_: Partial<FilterFormValues>, all: FilterFormValues) => {
    setStatusFilter(all.status);
    const r = all.range;
    if (r?.[0] && r?.[1]) {
      setDateRange([r[0], r[1]]);
    } else {
      setDateRange([null, null]);
    }
  };

  const columns: ColumnsType<PublishedItem> = [
    {
      title: "Job ID",
      dataIndex: "jobId",
      key: "jobId",
      render: (jobId: string) => (
        <Link to={`/jobs/${jobId}`} target="_blank" rel="noreferrer">
          {jobId.slice(0, 8)}…
        </Link>
      ),
    },
    {
      title: "Kênh",
      dataIndex: "channelId",
      key: "channelId",
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (s: string) => <StatusTag status={s} />,
    },
    {
      title: "Xuất bản lúc",
      dataIndex: "publishedAt",
      key: "publishedAt",
      render: (v: string | null) => (v ? new Date(v).toLocaleString("vi-VN") : "—"),
    },
    {
      title: "Tạo lúc",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (v: string) => new Date(v).toLocaleString("vi-VN"),
    },
    {
      title: "Tham chiếu publish",
      dataIndex: "publishRef",
      key: "publishRef",
      ellipsis: true,
      render: (v: string | null) => v ?? "—",
    },
  ];

  return (
    <PageShell>
      <AppPageHeader
        title="Bài đã xuất bản"
        description="Theo dõi kết quả publish theo kênh: trạng thái, thời điểm và tham chiếu hệ thống ngoài (n8n / CMS)."
      />
      <PageToolbar spread>
        <ProForm<FilterFormValues>
          form={filterForm}
          layout="inline"
          submitter={false}
          onValuesChange={handleFilterChange}
          style={{ rowGap: 8, columnGap: 12 }}
        >
          <ProFormSelect
            name="status"
            label="Trạng thái"
            allowClear
            fieldProps={{
              placeholder: "Tất cả",
              style: { minWidth: 170 },
              "aria-label": "Lọc trạng thái xuất bản",
            }}
            options={[
              { value: "published", label: "Đã publish" },
              { value: "failed", label: "Thất bại" },
            ]}
          />
          <ProFormDateRangePicker name="range" label="Khoảng ngày" fieldProps={{ allowClear: true }} />
        </ProForm>
        <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading} style={{ flexShrink: 0 }}>
          Làm mới
        </Button>
      </PageToolbar>
      {error && (
        <Alert type="error" showIcon message={error} closable onClose={() => setError(null)} />
      )}
      <PageTableCard>
        <Table<PublishedItem>
          columns={columns}
          dataSource={data?.items ?? []}
          rowKey="id"
          loading={loading}
          locale={{ emptyText: "Không có bản ghi xuất bản." }}
          pagination={{
            total: data?.total ?? 0,
            pageSize: pagination.limit,
            current: Math.floor(pagination.offset / pagination.limit) + 1,
            showSizeChanger: true,
            showTotal: (t) => `Tổng ${t} bản ghi`,
            onChange: (page, pageSize) => {
              setPagination({
                limit: pageSize ?? 50,
                offset: ((page ?? 1) - 1) * (pageSize ?? 50),
              });
            },
          }}
          scroll={{ x: "max-content" }}
        />
      </PageTableCard>
    </PageShell>
  );
}
