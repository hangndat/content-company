import { Button, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { EyeOutlined } from "@ant-design/icons";
import type { ExperimentListItem } from "@/features/ops/models/experiment";
import { StatusTag } from "./StatusTag";
import { GuardResultTag } from "./GuardResultTag";

interface ExperimentTableProps {
  dataSource: ExperimentListItem[];
  loading?: boolean;
  onViewDetail: (id: string) => void;
  onStart?: (id: string) => void;
  onPause?: (id: string) => void;
}

export function ExperimentTable({
  dataSource,
  loading,
  onViewDetail,
  onStart,
  onPause,
}: ExperimentTableProps) {
  const columns: ColumnsType<ExperimentListItem> = [
    { title: "Name", dataIndex: "name", key: "name", width: 200, ellipsis: true },
    { title: "Node Type", dataIndex: "nodeType", key: "nodeType", width: 100 },
    { title: "Scope", dataIndex: "scope", key: "scope", width: 100 },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (v) => <StatusTag status={v} />,
    },
    { title: "Arms", dataIndex: "armsCount", key: "armsCount", width: 70 },
    {
      title: "Started",
      dataIndex: "startedAt",
      key: "startedAt",
      width: 110,
      render: (v) => (v ? new Date(v).toLocaleDateString() : "—"),
    },
    {
      title: "Winner",
      dataIndex: "winnerSuggestion",
      key: "winnerSuggestion",
      width: 120,
      render: (v) =>
        v?.name ? <Tag color="gold">{v.name}</Tag> : "—",
    },
    {
      title: "Sample OK",
      dataIndex: "sampleSufficient",
      key: "sampleSufficient",
      width: 100,
      render: (v) => (
        <GuardResultTag
          passes={v ?? false}
          label={v ? "Yes" : "No"}
        />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 140,
      render: (_, r) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => onViewDetail(r.id)}
          >
            View
          </Button>
          {onStart && (r.status === "draft" || r.status === "paused") && (
            <Button type="link" size="small" onClick={() => onStart(r.id)}>
              Start
            </Button>
          )}
          {onPause && r.status === "running" && (
            <Button type="link" size="small" onClick={() => onPause(r.id)}>
              Pause
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Table
      dataSource={dataSource}
      columns={columns}
      rowKey="id"
      size="small"
      pagination={{ pageSize: 20 }}
      loading={loading}
      locale={{ emptyText: "No experiments yet" }}
    />
  );
}
