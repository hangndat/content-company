import { Card, Skeleton, Statistic } from "antd";

interface SummaryStatCardProps {
  title: string;
  value: number | string | null | undefined;
  suffix?: string;
  loading?: boolean;
}

export function SummaryStatCard({ title, value, suffix, loading }: SummaryStatCardProps) {
  if (loading) {
    return (
      <Card>
        <Skeleton.Input active size="small" style={{ width: 60 }} />
        <div style={{ marginTop: 4, color: "#999", fontSize: 12 }}>{title}</div>
      </Card>
    );
  }

  return (
    <Card>
      <Statistic title={title} value={value ?? "—"} suffix={suffix} />
    </Card>
  );
}
