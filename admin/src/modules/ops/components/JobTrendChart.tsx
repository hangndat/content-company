import { Card, Empty, Segmented } from "antd";
import { Line } from "@ant-design/charts";
import type { JobTrendPoint } from "../models/dashboard";

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

export function JobTrendChart({
  series,
  granularity,
  onGranularityChange,
  loading,
}: JobTrendChartProps) {
  const chartData: ChartDataPoint[] = (series ?? []).flatMap((r) => [
    { date: r.date, metric: "created", value: r.created },
    { date: r.date, metric: "completed", value: r.completed },
    { date: r.date, metric: "failed", value: r.failed },
    { date: r.date, metric: "approved", value: r.approved },
    { date: r.date, metric: "review_required", value: r.reviewRequired },
    { date: r.date, metric: "rejected", value: r.rejected },
  ]);

  return (
    <Card
      title="Job Trends"
      extra={
        onGranularityChange && (
          <Segmented
            value={granularity}
            onChange={(v) => onGranularityChange(v as "day" | "hour")}
            options={[
              { value: "day", label: "Day" },
              { value: "hour", label: "Hour" },
            ]}
          />
        )
      }
    >
      {loading ? (
        <div style={{ padding: 48, textAlign: "center", color: "#999" }}>
          Loading...
        </div>
      ) : chartData.length === 0 ? (
        <Empty description="No trend data" />
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
