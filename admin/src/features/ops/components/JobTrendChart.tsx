import { Card, Empty, Segmented } from "antd";
import { Line } from "@ant-design/charts";
import type { JobTrendPoint } from "@/features/ops/models/dashboard";

interface JobTrendChartProps {
  series: JobTrendPoint[];
  granularity: "day" | "hour";
  onGranularityChange?: (g: "day" | "hour") => void;
  loading?: boolean;
}

interface ChartDataPoint {
  date: string;
  metric: string;
  value: number;
}

const M = {
  created: "Tạo mới",
  completed: "Hoàn thành",
  failed: "Thất bại",
  approved: "Đã duyệt",
  review_required: "Cần review",
  rejected: "Từ chối",
} as const;

export function JobTrendChart({
  series,
  granularity,
  onGranularityChange,
  loading,
}: JobTrendChartProps) {
  const chartData: ChartDataPoint[] = (series ?? []).flatMap((r) => [
    { date: r.date, metric: M.created, value: r.created },
    { date: r.date, metric: M.completed, value: r.completed },
    { date: r.date, metric: M.failed, value: r.failed },
    { date: r.date, metric: M.approved, value: r.approved },
    { date: r.date, metric: M.review_required, value: r.reviewRequired },
    { date: r.date, metric: M.rejected, value: r.rejected },
  ]);

  return (
    <Card
      title="Xu hướng job theo thời gian"
      extra={
        onGranularityChange && (
          <Segmented
            value={granularity}
            onChange={(v) => onGranularityChange(v as "day" | "hour")}
            options={[
              { value: "day", label: "Theo ngày" },
              { value: "hour", label: "Theo giờ" },
            ]}
          />
        )
      }
    >
      {loading ? (
        <div style={{ padding: 48, textAlign: "center", color: "#999" }}>
          Đang tải biểu đồ…
        </div>
      ) : chartData.length === 0 ? (
        <Empty description="Chưa có dữ liệu xu hướng trong khoảng thời gian đã chọn." />
      ) : (
        <Line
          data={chartData}
          xField="date"
          yField="value"
          seriesField="metric"
          xAxis={{ type: "cat" }}
          legend={{ position: "top" }}
        />
      )}
    </Card>
  );
}
