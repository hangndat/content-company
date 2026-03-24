import { useEffect, useState } from "react";
import { Button, Card, Space, Tag, Typography } from "antd";
import { ExportOutlined } from "@ant-design/icons";
import { api } from "@/lib/api";

export type ObservabilityPayload = {
  enabled: boolean;
  uiUrl: string | null;
  days: number;
  usage: {
    totalTokens: number | null;
    totalCostUsd: number | null;
    observationCount: number | null;
  } | null;
};

type Props = {
  days: number;
};

export function LangfuseObservabilityCard({ days }: Props) {
  const [data, setData] = useState<ObservabilityPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    api
      .observability({ days })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e: Error) => {
        if (!cancelled) setErr(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  const usage = data?.usage;
  const hasUsage =
    usage &&
    (usage.totalTokens != null || usage.totalCostUsd != null || usage.observationCount != null);

  return (
    <Card title="Quan sát LLM (Langfuse)" loading={loading} size="small">
      {err && <Typography.Text type="danger">{err}</Typography.Text>}
      {!err && data && (
        <Space direction="vertical" size="small" style={{ width: "100%" }}>
          <div>
            <Tag color={data.enabled ? "green" : "default"}>
              {data.enabled ? "Đã cấu hình" : "Chưa cấu hình"}
            </Tag>
            <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
              {data.days} ngày gần nhất (API metrics Langfuse)
            </Typography.Text>
          </div>
          {hasUsage && (
            <Typography.Text>
              {usage!.observationCount != null && (
                <span>Observations: {usage!.observationCount.toLocaleString("vi-VN")} · </span>
              )}
              {usage!.totalTokens != null && (
                <span>Tokens (tổng): {usage!.totalTokens.toLocaleString("vi-VN")} · </span>
              )}
              {usage!.totalCostUsd != null && <span>Chi phí (USD): {usage!.totalCostUsd.toFixed(4)}</span>}
            </Typography.Text>
          )}
          {data.enabled && !hasUsage && (
            <Typography.Text type="secondary">
              Chưa có số liệu tổng hợp — chạy job có tracing hoặc kiểm tra phiên bản/API Langfuse.
            </Typography.Text>
          )}
          {data.uiUrl && (
            <Button
              type="link"
              href={data.uiUrl}
              target="_blank"
              rel="noopener noreferrer"
              icon={<ExportOutlined />}
              style={{ paddingLeft: 0 }}
            >
              Mở giao diện Langfuse
            </Button>
          )}
        </Space>
      )}
    </Card>
  );
}
