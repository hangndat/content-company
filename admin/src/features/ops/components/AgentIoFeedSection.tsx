import { useCallback, useEffect, useState } from "react";
import { Button, Modal, Select, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Link } from "react-router-dom";
import { EyeOutlined, ReloadOutlined } from "@ant-design/icons";
import { api } from "@/lib/api";
import type { AgentIoFeedItem } from "@/features/ops/models/agent-io";
import { PageTableCard } from "@/shared/components/PageTableCard";

const { Paragraph, Text } = Typography;

const DAYS_OPTIONS = [
  { value: 3, label: "3 ngày" },
  { value: 7, label: "7 ngày" },
  { value: 14, label: "14 ngày" },
  { value: 30, label: "30 ngày" },
];

const LIMIT_OPTIONS = [
  { value: 20, label: "20 dòng" },
  { value: 40, label: "40 dòng" },
  { value: 80, label: "80 dòng" },
];

interface AgentIoFeedSectionProps {
  /** planner | scorer | writer | reviewer */
  step: string;
}

export function AgentIoFeedSection({ step }: AgentIoFeedSectionProps) {
  const [days, setDays] = useState(7);
  const [limit, setLimit] = useState(40);
  const [items, setItems] = useState<AgentIoFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailModal, setDetailModal] = useState<{
    row: AgentIoFeedItem;
    focus: "input" | "output";
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.agentIo({ step, days, limit });
      setItems(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được luồng I/O.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [step, days, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ColumnsType<AgentIoFeedItem> = [
    {
      title: "Thời điểm (snapshot)",
      dataIndex: "recordedAt",
      key: "recordedAt",
      width: 175,
      render: (v: string) => new Date(v).toLocaleString("vi-VN"),
    },
    {
      title: "Job",
      dataIndex: "jobId",
      key: "jobId",
      width: 120,
      ellipsis: true,
      render: (id: string) => (
        <Link to={`/jobs/${id}`} title={id}>
          {id.slice(0, 8)}…
        </Link>
      ),
    },
    {
      title: "Job / nguồn",
      key: "meta",
      width: 130,
      render: (_, r) => (
        <span>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {r.jobStatus}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>
            {r.sourceType}
          </Text>
        </span>
      ),
    },
    {
      title: "Prompt v#",
      dataIndex: "promptVersion",
      key: "promptVersion",
      width: 88,
      align: "center",
      render: (v: number | null) => (v != null ? v : "—"),
    },
    {
      title: "Input (vào bước)",
      dataIndex: "inputPreview",
      key: "inputPreview",
      ellipsis: true,
      render: (_, row) => (
        <Space size="small" wrap>
          <Text ellipsis={{ tooltip: row.inputPreview }} style={{ maxWidth: 220 }}>
            {row.inputPreview}
          </Text>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => setDetailModal({ row, focus: "input" })}
          >
            Đầy đủ
          </Button>
        </Space>
      ),
    },
    {
      title: "Output (ra bước)",
      dataIndex: "outputPreview",
      key: "outputPreview",
      ellipsis: true,
      render: (_, row) => (
        <Space size="small" wrap>
          <Text ellipsis={{ tooltip: row.outputPreview }} style={{ maxWidth: 220 }}>
            {row.outputPreview}
          </Text>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => setDetailModal({ row, focus: "output" })}
          >
            Đầy đủ
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Paragraph type="secondary" style={{ marginBottom: 12 }}>
        Dữ liệu lấy từ <Text code>JobStateSnapshot</Text> sau mỗi lần chạy bước này (pipeline nội dung, không gồm job
        trend). <strong>Input</strong> là phần trạng thái mà bước đọc; <strong>output</strong> là phần bước ghi (theo
        snapshot ngay sau khi hoàn thành bước).
      </Paragraph>
      {error && (
        <Paragraph type="danger" style={{ marginBottom: 12 }}>
          {error}
        </Paragraph>
      )}
      <Space wrap style={{ marginBottom: 12 }}>
        <span>Khoảng thời gian:</span>
        <Select
          value={days}
          options={DAYS_OPTIONS}
          onChange={(v) => setDays(v)}
          style={{ width: 120 }}
        />
        <span>Giới hạn:</span>
        <Select
          value={limit}
          options={LIMIT_OPTIONS}
          onChange={(v) => setLimit(v)}
          style={{ width: 120 }}
        />
        <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
          Làm mới
        </Button>
      </Space>
      <PageTableCard>
        <Table<AgentIoFeedItem>
          size="small"
          rowKey="snapshotId"
          loading={loading}
          dataSource={items}
          columns={columns}
          pagination={false}
          scroll={{ x: "max-content" }}
          locale={{ emptyText: "Chưa có snapshot trong khoảng thời gian này." }}
        />
      </PageTableCard>

      <Modal
        title={
          detailModal
            ? `Chi tiết I/O — job ${detailModal.row.jobId.slice(0, 8)}… · ${new Date(detailModal.row.recordedAt).toLocaleString("vi-VN")}`
            : ""
        }
        open={!!detailModal}
        onCancel={() => setDetailModal(null)}
        width={900}
        footer={[
          <Button key="close" type="primary" onClick={() => setDetailModal(null)}>
            Đóng
          </Button>,
        ]}
      >
        {detailModal && (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <div>
              <Text strong>Input (vào bước)</Text>
              <pre
                style={{
                  marginTop: 8,
                  maxHeight: detailModal.focus === "input" ? 480 : 200,
                  overflow: "auto",
                  padding: 12,
                  background: "#f5f5f5",
                  borderRadius: 6,
                  fontSize: 12,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {detailModal.row.inputDetail || "—"}
              </pre>
            </div>
            <div>
              <Text strong>Output (ra bước)</Text>
              <pre
                style={{
                  marginTop: 8,
                  maxHeight: detailModal.focus === "output" ? 480 : 200,
                  overflow: "auto",
                  padding: 12,
                  background: "#f5f5f5",
                  borderRadius: 6,
                  fontSize: 12,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {detailModal.row.outputDetail || "—"}
              </pre>
            </div>
            <Link to={`/jobs/${detailModal.row.jobId}`}>Mở chi tiết job (toàn bộ bước)</Link>
          </Space>
        )}
      </Modal>
    </>
  );
}
