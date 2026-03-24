import { Card, Table } from "antd";
import { formatLargeNumber } from "../../../shared/utils/formatters";
import type { ChannelsResult } from "../models/dashboard";

interface ChannelPerformanceCardProps {
  data: ChannelsResult | null;
  loading?: boolean;
}

export function ChannelPerformanceCard({ data, loading }: ChannelPerformanceCardProps) {
  if (loading) {
    return (
      <Card title="Channel Performance">
        <div style={{ padding: 24, color: "#999" }}>Loading...</div>
      </Card>
    );
  }

  if (!data || !data.items?.length) {
    return (
      <Card title="Channel Performance">
        <div style={{ padding: 24, color: "#999" }}>No channel data</div>
      </Card>
    );
  }

  const columns = [
    { title: "Channel", dataIndex: "channelId", key: "channelId", width: 120 },
    {
      title: "Jobs",
      dataIndex: "jobsCount",
      key: "jobsCount",
      width: 80,
      render: (v: number) => formatLargeNumber(v),
    },
    {
      title: "Approved",
      dataIndex: "approvedCount",
      key: "approvedCount",
      width: 90,
      render: (v: number) => formatLargeNumber(v),
    },
    {
      title: "Publish OK",
      dataIndex: "publishSuccess",
      key: "publishSuccess",
      width: 90,
      render: (v: number) => formatLargeNumber(v),
    },
    {
      title: "Publish Fail",
      dataIndex: "publishFailed",
      key: "publishFailed",
      width: 90,
      render: (v: number) => formatLargeNumber(v),
    },
    {
      title: "Views",
      dataIndex: "views",
      key: "views",
      width: 80,
      render: (v: number) => formatLargeNumber(v),
    },
    {
      title: "Clicks",
      dataIndex: "clicks",
      key: "clicks",
      width: 80,
      render: (v: number) => formatLargeNumber(v),
    },
  ];

  return (
    <Card title="Channel Performance">
      <Table
        dataSource={data.items}
        columns={columns}
        rowKey="channelId"
        size="small"
        pagination={false}
      />
    </Card>
  );
}
