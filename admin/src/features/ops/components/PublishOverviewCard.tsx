import { Card, Row, Col, Statistic } from "antd";
import { formatLargeNumber } from "@/shared/utils/formatters";
import type { PublishMetricsResult } from "@/features/ops/models/dashboard";

interface PublishOverviewCardProps {
  data: PublishMetricsResult | null;
  loading?: boolean;
}

export function PublishOverviewCard({ data, loading }: PublishOverviewCardProps) {
  if (loading) {
    return (
      <Card title="Tổng quan xuất bản">
        <div style={{ padding: 24, color: "#999" }}>Đang tải…</div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card title="Tổng quan xuất bản">
        <div style={{ padding: 24, color: "#999" }}>Chưa có dữ liệu.</div>
      </Card>
    );
  }

  const { total } = data;

  return (
    <Card title="Tổng quan xuất bản">
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Statistic title="Thành công" value={formatLargeNumber(total?.success ?? 0)} />
        </Col>
        <Col xs={24} sm={12}>
          <Statistic title="Thất bại" value={formatLargeNumber(total?.failed ?? 0)} />
        </Col>
      </Row>
    </Card>
  );
}
