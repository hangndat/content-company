import { Card, Row, Col, Statistic } from "antd";
import { formatLargeNumber } from "../../../shared/utils/formatters";

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
      <Card title="Queue">
        <div style={{ padding: 24, color: "#999" }}>Loading...</div>
      </Card>
    );
  }

  if (!queue) {
    return (
      <Card title="Queue">
        <div style={{ padding: 24, color: "#999" }}>
          {note ?? "Queue not configured"}
        </div>
      </Card>
    );
  }

  return (
    <Card title="Queue" extra={note ? <span style={{ fontSize: 12, color: "#999" }}>{note}</span> : null}>
      <Row gutter={16}>
        <Col span={4}>
          <Statistic title="Waiting" value={queue.waiting} />
        </Col>
        <Col span={4}>
          <Statistic title="Active" value={queue.active} />
        </Col>
        <Col span={4}>
          <Statistic title="Delayed" value={queue.delayed} />
        </Col>
        <Col span={4}>
          <Statistic title="Failed" value={queue.failed} />
        </Col>
        <Col span={4}>
          <Statistic title="Completed" value={formatLargeNumber(queue.completed ?? 0)} />
        </Col>
        <Col span={4}>
          <Statistic title="Paused" value={queue.paused ?? 0} />
        </Col>
      </Row>
    </Card>
  );
}
