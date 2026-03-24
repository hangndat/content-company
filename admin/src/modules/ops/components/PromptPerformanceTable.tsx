import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { PromptPerformanceItem } from "../models/dashboard";
import {
  formatPercent,
  formatPercentShort,
  formatReviewScore,
  formatLargeNumber,
} from "../../../shared/utils/formatters";

interface PromptPerformanceTableProps {
  dataSource: PromptPerformanceItem[];
  loading?: boolean;
}

export function PromptPerformanceTable({ dataSource, loading }: PromptPerformanceTableProps) {
  const columns: ColumnsType<PromptPerformanceItem> = [
    { title: "Type", dataIndex: "type", key: "type", width: 80 },
    { title: "Version", dataIndex: "version", key: "version", width: 80 },
    {
      title: "Active",
      dataIndex: "isActive",
      key: "isActive",
      width: 70,
      render: (v) => (v ? "Yes" : "No"),
    },
    {
      title: "Jobs",
      dataIndex: "jobsCount",
      key: "jobsCount",
      width: 80,
      render: (v) => formatLargeNumber(v),
    },
    {
      title: "Approve Rate",
      dataIndex: "approveRate",
      key: "approveRate",
      width: 120,
      render: (v) => formatPercentShort(v),
    },
    {
      title: "Reject Rate",
      key: "rejectRate",
      width: 110,
      render: (_, r) => {
        const rate =
          r.jobsCount > 0 ? r.rejectedCount / r.jobsCount : null;
        return formatPercentShort(rate);
      },
    },
    {
      title: "Avg Review Score",
      dataIndex: "avgReviewScore",
      key: "avgReviewScore",
      width: 140,
      render: (v) => formatReviewScore(v),
    },
    {
      title: "Smoothed CTR",
      dataIndex: "smoothedCtr",
      key: "smoothedCtr",
      width: 120,
      render: (v) => formatPercent(v),
    },
    {
      title: "Experiment Usage",
      dataIndex: "experimentUsageCount",
      key: "experimentUsageCount",
      width: 120,
      render: (v) => (v != null ? formatLargeNumber(v) : "—"),
    },
  ];

  return (
    <Table
      dataSource={dataSource}
      columns={columns}
      rowKey={(r) => `${r.type}-${r.version}`}
      size="small"
      pagination={false}
      loading={loading}
      locale={{ emptyText: "No prompt performance data yet" }}
    />
  );
}
