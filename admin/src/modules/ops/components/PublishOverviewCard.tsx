import { Card, Row, Col, Statistic } from "antd";
import { formatLargeNumber } from "../../../shared/utils/formatters";
import type { PublishMetricsResult } from "../models/dashboard";

interface PublishOverviewCardProps {
  data: PublishMetricsResult | null;
  loading?: boolean;
}

export function PublishOverviewCard({ data, loading }: PublishOverviewCardProps) {
  if (loading) {
    return (
      <Card title="Publish Overview">
        <div style={{ padding: 24, color: "#999" }}>Loading...</div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card title="Publish Overview">
        <div style={{ padding: 24, color: "#999" }}>No data</div>
      </Card>
    );
  }

  const { total } = data;

  return (
    <Card title="Publish Overview">
      <Row gutter={16}>
        <Col span={6}>
          <Statistic title="Success" value={formatLargeNumber(total?.success ?? 0)} />
        </Col>
        <Col span={6}>
          <Statistic title="Failed" value={formatLargeNumber(total?.failed ?? 0)} />
        </Col>
      </Row>
    </Card>
  );
}
