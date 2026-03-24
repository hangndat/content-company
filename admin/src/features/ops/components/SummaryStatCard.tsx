import { Card, Skeleton, Statistic, theme } from "antd";

interface SummaryStatCardProps {
  title: string;
  value: number | string | null | undefined;
  suffix?: string;
  loading?: boolean;
}

export function SummaryStatCard({ title, value, suffix, loading }: SummaryStatCardProps) {
  const { token } = theme.useToken();

  if (loading) {
    return (
      <Card
        size="small"
        styles={{
          body: { paddingBlock: token.paddingSM, paddingInline: token.paddingSM },
        }}
      >
        <Skeleton.Input active size="small" style={{ width: 56, height: 22 }} />
        <div style={{ marginTop: 6, color: token.colorTextSecondary, fontSize: token.fontSizeSM }}>{title}</div>
      </Card>
    );
  }

  return (
    <Card
      size="small"
      styles={{
        body: { paddingBlock: token.paddingSM, paddingInline: token.paddingSM },
      }}
    >
      <Statistic
        title={<span style={{ fontSize: token.fontSizeSM }}>{title}</span>}
        value={value ?? "—"}
        suffix={suffix}
        valueStyle={{ fontSize: token.fontSizeHeading4, fontWeight: 600 }}
      />
    </Card>
  );
}
