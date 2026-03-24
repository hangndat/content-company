import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { TopicPerformanceItem } from "@/features/ops/models/dashboard";
import { formatPercent, formatReviewScore, formatLargeNumber } from "@/shared/utils/formatters";

interface TopicPerformanceTableProps {
  dataSource: TopicPerformanceItem[];
  loading?: boolean;
}

export function TopicPerformanceTable({ dataSource, loading }: TopicPerformanceTableProps) {
  const columns: ColumnsType<TopicPerformanceItem> = [
    {
      title: "Topic",
      dataIndex: "topicKey",
      key: "topicKey",
      width: 200,
      ellipsis: true,
      render: (v) => v ?? "—",
    },
    {
      title: "Sample Count",
      dataIndex: "sampleCount",
      key: "sampleCount",
      width: 120,
      render: (v) => formatLargeNumber(v),
    },
    {
      title: "Avg CTR",
      dataIndex: "avgCtr",
      key: "avgCtr",
      width: 100,
      render: (v) => formatPercent(v),
    },
    {
      title: "Avg Review Score",
      dataIndex: "avgReviewScore",
      key: "avgReviewScore",
      width: 140,
      render: (v) => formatReviewScore(v),
    },
  ];

  return (
    <Table
      dataSource={dataSource}
      columns={columns}
      rowKey={(r) => `${r.topicKey}-${r.topicSignature}`}
      size="small"
      pagination={false}
      loading={loading}
      locale={{ emptyText: "No topic data yet" }}
    />
  );
}
