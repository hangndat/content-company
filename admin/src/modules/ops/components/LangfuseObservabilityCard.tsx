import { useEffect, useState } from "react";
import { Button, Card, Space, Tag, Typography } from "antd";
import { ExportOutlined } from "@ant-design/icons";
import { api } from "../../../api";

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
    <Card title="LLM observability (Langfuse)" loading={loading} size="small">
      {err && <Typography.Text type="danger">{err}</Typography.Text>}
      {!err && data && (
        <Space direction="vertical" size="small" style={{ width: "100%" }}>
          <div>
            <Tag color={data.enabled ? "green" : "default"}>
              {data.enabled ? "Configured" : "Not configured"}
            </Tag>
            <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
              Last {data.days} days (from Langfuse metrics API)
            </Typography.Text>
          </div>
          {hasUsage && (
            <Typography.Text>
              {usage!.observationCount != null && (
                <span>Observations: {usage!.observationCount.toLocaleString()} · </span>
              )}
              {usage!.totalTokens != null && (
                <span>Tokens (sum): {usage!.totalTokens.toLocaleString()} · </span>
              )}
              {usage!.totalCostUsd != null && <span>Cost (USD): {usage!.totalCostUsd.toFixed(4)}</span>}
            </Typography.Text>
          )}
          {data.enabled && !hasUsage && (
            <Typography.Text type="secondary">
              No aggregate metrics returned (run jobs with tracing, or check Langfuse version/API).
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
              Open Langfuse UI
            </Button>
          )}
        </Space>
      )}
    </Card>
  );
}
