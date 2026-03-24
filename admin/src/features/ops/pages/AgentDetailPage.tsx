import { useEffect, useState, useMemo, useCallback } from "react";
import { Button, Space, Tag, Typography, Alert } from "antd";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ExperimentOutlined, ReloadOutlined, BulbOutlined } from "@ant-design/icons";
import { api } from "@/lib/api";
import { getAgent, isAgentType } from "@/features/ops/constants/agents";
import { PromptVersionsPanel } from "@/features/ops/components/PromptVersionsPanel";
import { PromptPerformanceTable } from "@/features/ops/components/PromptPerformanceTable";
import { AgentIoFeedSection } from "@/features/ops/components/AgentIoFeedSection";
import { useExperimentList } from "@/features/ops/hooks/useExperimentList";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { AppPageHeader } from "@/shared/components/AppPageHeader";
import { ErrorState } from "@/shared/components/ErrorState";
import { PageShell } from "@/shared/components/PageShell";
import { PageCenteredSpin } from "@/shared/components/PageCenteredSpin";
import { PageSectionCard } from "@/shared/components/PageSectionCard";
import { PageBackNav } from "@/shared/components/PageBackNav";
import type { PromptPerformanceItem } from "@/features/ops/models/dashboard";

const { Paragraph, Text } = Typography;

const METRICS_DAYS = 7;

export default function AgentDetailPage() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();

  if (!type || !isAgentType(type)) {
    return <Navigate to="/agents" replace />;
  }

  const agent = getAgent(type)!;
  useDocumentTitle(agent.nameVi);

  const [promptItems, setPromptItems] = useState<PromptPerformanceItem[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(true);
  const [promptsError, setPromptsError] = useState<string | null>(null);

  const expParams = useMemo(() => ({ nodeType: type }), [type]);
  const { data: expData, loading: expLoading, error: expError, reload: reloadExp } = useExperimentList(expParams);

  const loadPrompts = useCallback(async () => {
    setPromptsLoading(true);
    setPromptsError(null);
    try {
      const res = await api.prompts({ type, days: METRICS_DAYS });
      setPromptItems(res.items.filter((i) => i.type === type));
    } catch (e) {
      setPromptsError(e instanceof Error ? e.message : "Không tải được hiệu suất prompt.");
    } finally {
      setPromptsLoading(false);
    }
  }, [type]);

  useEffect(() => {
    void loadPrompts();
  }, [loadPrompts]);

  const experimentCount = expData?.items?.length ?? 0;
  const experimentsHref = `/experiments?nodeType=${encodeURIComponent(type)}`;

  return (
    <PageShell>
      <PageBackNav label="Tất cả agent" onBack={() => navigate("/agents")} />
      <AppPageHeader
        title={agent.nameVi}
        description={`Agent "${type}" trong pipeline — tinh chỉnh prompt, đọc chỉ số và gắn với thử nghiệm A/B.`}
        extra={
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={() => void loadPrompts()} loading={promptsLoading}>
              Làm mới chỉ số
            </Button>
            <Link to={`/agents/${type}/tune`}>
              <Button type="primary" icon={<BulbOutlined />}>
                Phòng thử prompt
              </Button>
            </Link>
            <Link to={experimentsHref}>
              <Button icon={<ExperimentOutlined />}>Thử nghiệm A/B</Button>
            </Link>
          </Space>
        }
      />

      <PageSectionCard title="Vai trò & placeholder">
        <Paragraph>{agent.description}</Paragraph>
        <Text type="secondary">Biến thay thế trong prompt (dạng {"{{NAME}}"}): </Text>
        <div style={{ marginTop: 8 }}>
          {agent.placeholders.map((p) => (
            <Tag key={p} style={{ marginBottom: 4 }}>
              {`{{${p}}}`}
            </Tag>
          ))}
        </div>
      </PageSectionCard>

      <div style={{ marginTop: 16 }}>
        <PageSectionCard title="Input / output theo thời gian">
          <AgentIoFeedSection step={type} />
        </PageSectionCard>
      </div>

      <div style={{ marginTop: 16 }}>
        <PageSectionCard title={`Hiệu suất prompt (${METRICS_DAYS} ngày)`}>
        {promptsError && (
          <Alert type="error" showIcon message={promptsError} style={{ marginBottom: 12 }} closable />
        )}
        {promptsLoading && !promptItems.length ? (
          <PageCenteredSpin tip="Đang tải…" />
        ) : (
          <PromptPerformanceTable dataSource={promptItems} loading={promptsLoading} />
        )}
        </PageSectionCard>
      </div>

      <div style={{ marginTop: 16 }}>
        <PageSectionCard title="Thử nghiệm (multi-arm)">
        {expError ? (
          <ErrorState message={expError} onRetry={() => void reloadExp()} />
        ) : (
          <>
            <Paragraph style={{ marginBottom: 12 }}>
              Đang có <Text strong>{expLoading ? "…" : experimentCount}</Text> thử nghiệm khớp node{" "}
              <Tag>{type}</Tag>. Lọc sẵn theo node khi bạn mở từ nút bên dưới.
            </Paragraph>
            <Link to={experimentsHref}>
              <Button icon={<ExperimentOutlined />}>Mở danh sách thử nghiệm</Button>
            </Link>
          </>
        )}
        </PageSectionCard>
      </div>

      <div style={{ marginTop: 16 }}>
        <PageSectionCard
          title="Phiên bản prompt"
          extra={
            <Link to={`/agents/${type}/tune`}>
              <Button size="small" type="link">
                Mở phòng thử prompt (job + input + dry-run)
              </Button>
            </Link>
          }
        >
          <PromptVersionsPanel promptType={type} title={`Phiên bản — ${agent.nameVi}`} />
        </PageSectionCard>
      </div>
    </PageShell>
  );
}
