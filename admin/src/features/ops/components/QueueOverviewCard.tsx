import { Card, Row, Col, Statistic } from "antd";
import { formatLargeNumber } from "@/shared/utils/formatters";

interface QueueData {
  waiting: number;
  active: number;
  delayed: number;
  failed: number;
  completed?: number;
  paused?: number;
}

interface QueueOverviewCardProps {
  queue: QueueData | null;
  loading?: boolean;
  note?: string;
}

export function QueueOverviewCard({ queue, loading, note }: QueueOverviewCardProps) {
  if (loading) {
    return (
      <Card title="Hàng đợi BullMQ">
        <div style={{ padding: 24, color: "#999" }}>Đang tải…</div>
      </Card>
    );
  }

  if (!queue) {
    return (
      <Card title="Hàng đợi BullMQ">
        <div style={{ padding: 24, color: "#999" }}>
          {note ?? "Chưa cấu hình hoặc không đọc được Redis/BullMQ."}
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Hàng đợi BullMQ"
      extra={note ? <span style={{ fontSize: 12, color: "#999" }}>{note}</span> : null}
    >
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={8} md={4}>
          <Statistic title="Chờ" value={queue.waiting} />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Statistic title="Đang chạy" value={queue.active} />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Statistic title="Trễ" value={queue.delayed} />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Statistic title="Lỗi" value={queue.failed} />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Statistic title="Hoàn thành" value={formatLargeNumber(queue.completed ?? 0)} />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Statistic title="Tạm dừng" value={queue.paused ?? 0} />
        </Col>
      </Row>
    </Card>
  );
}
