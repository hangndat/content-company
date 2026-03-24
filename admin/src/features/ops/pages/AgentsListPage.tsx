import { useEffect, useState, useMemo } from "react";
import { Button, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Link } from "react-router-dom";
import { ReloadOutlined, RightOutlined } from "@ant-design/icons";
import { api } from "@/lib/api";
import { AGENTS } from "@/features/ops/constants/agents";
import type { PromptVersionRow } from "@/features/ops/components/PromptVersionsPanel";
import type { PromptPerformanceItem } from "@/features/ops/models/dashboard";
import { formatPercentShort, formatReviewScore } from "@/shared/utils/formatters";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { AppPageHeader } from "@/shared/components/AppPageHeader";
import { ErrorState } from "@/shared/components/ErrorState";
import { PageShell } from "@/shared/components/PageShell";
import { PageCenteredSpin } from "@/shared/components/PageCenteredSpin";
import { PageTableCard } from "@/shared/components/PageTableCard";

const { Text } = Typography;

function activeVersionForType(
  list: PromptVersionRow[] | undefined
): { version: number | null; isActive: boolean } {
  if (!list?.length) return { version: null, isActive: false };
  const active = list.find((p) => p.isActive);
  if (active) return { version: active.version, isActive: true };
  const latest = [...list].sort((a, b) => b.version - a.version)[0];
  return { version: latest?.version ?? null, isActive: false };
}

function pickPerformanceRow(items: PromptPerformanceItem[], activeVersion: number | null) {
  if (!items.length) return null;
  if (activeVersion != null) {
    const byVer = items.find((i) => i.version === activeVersion);
    if (byVer) return byVer;
  }
  return items.find((i) => i.isActive) ?? items[0] ?? null;
}

type AgentListRow = {
  key: string;
  agentId: string;
  nameVi: string;
  description: string;
  activeVersion: number | null;
  jobs7d: number;
  approveRate: string;
  avgReviewScore: string;
};

export default function AgentsListPage() {
  useDocumentTitle("Agent AI");
  const [promptsByType, setPromptsByType] = useState<Record<string, PromptVersionRow[]>>({});
  const [metricsByType, setMetricsByType] = useState<Record<string, PromptPerformanceItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const listResult = (await api.promptsList()) as Record<string, PromptVersionRow[]>;
      setPromptsByType(listResult);
      const days = 7;
      const perfResults = await Promise.all(
        AGENTS.map(async (a) => {
          const res = await api.prompts({ type: a.id, days });
          return [a.id, res.items] as const;
        })
      );
      const next: Record<string, PromptPerformanceItem[]> = {};
      for (const [id, items] of perfResults) next[id] = items;
      setMetricsByType(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const dataSource = useMemo<AgentListRow[]>(() => {
    return AGENTS.map((agent) => {
      const versions = promptsByType[agent.id];
      const { version: activeVer } = activeVersionForType(versions);
      const items = metricsByType[agent.id] ?? [];
      const row = pickPerformanceRow(items, activeVer);
      return {
        key: agent.id,
        agentId: agent.id,
        nameVi: agent.nameVi,
        description: agent.description,
        activeVersion: activeVer,
        jobs7d: row?.jobsCount ?? 0,
        approveRate: row?.approveRate != null ? formatPercentShort(row.approveRate) : "—",
        avgReviewScore: formatReviewScore(row?.avgReviewScore ?? null),
      };
    });
  }, [promptsByType, metricsByType]);

  const columns: ColumnsType<AgentListRow> = [
    {
      title: "Agent",
      key: "agent",
      width: 200,
      render: (_, r) => (
        <div>
          <Text strong>{r.nameVi}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {r.agentId}
          </Text>
        </div>
      ),
    },
    {
      title: "Vai trò",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (text: string) => <span title={text}>{text}</span>,
    },
    {
      title: "Phiên bản đang dùng",
      dataIndex: "activeVersion",
      key: "activeVersion",
      width: 130,
      align: "center",
      render: (v: number | null) => (v != null ? `v${v}` : "—"),
    },
    {
      title: "Job (7 ngày)",
      dataIndex: "jobs7d",
      key: "jobs7d",
      width: 110,
      align: "right",
    },
    {
      title: "Approve rate",
      dataIndex: "approveRate",
      key: "approveRate",
      width: 120,
      align: "right",
    },
    {
      title: "Avg review score",
      dataIndex: "avgReviewScore",
      key: "avgReviewScore",
      width: 130,
      align: "right",
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 120,
      fixed: "right",
      render: (_, r) => (
        <Link to={`/agents/${r.agentId}`}>
          Chi tiết <RightOutlined />
        </Link>
      ),
    },
  ];

  if (loading && !error && Object.keys(promptsByType).length === 0) {
    return (
      <PageShell>
        <PageCenteredSpin tip="Đang tải agent…" />
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <ErrorState message={error} onRetry={() => void load()} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <AppPageHeader
        title="Quản lý agent"
        description="Mỗi agent là một bước trong pipeline nội dung: theo dõi phiên bản prompt, chỉ số gần đây và tinh chỉnh như quản lý nhân sự chất lượng."
        extra={
          <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
            Làm mới
          </Button>
        }
      />

      <PageTableCard>
        <Table<AgentListRow>
          size="small"
          rowKey="key"
          loading={loading}
          dataSource={dataSource}
          columns={columns}
          pagination={false}
          scroll={{ x: "max-content" }}
        />
      </PageTableCard>
    </PageShell>
  );
}
