import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Alert, Button, Descriptions, Space, Tag, Typography } from "antd";
import { api } from "@/lib/api";
import type { TrendCandidate } from "@/features/ops/models/job";
import { resolveArticlesForTopic, TopicArticlesBlock } from "@/features/ops/components/TopicArticlesBlock";
import { stripHtml } from "@/shared/utils/stripHtml";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { AppPageHeader } from "@/shared/components/AppPageHeader";
import { PageShell } from "@/shared/components/PageShell";
import { PageBackNav } from "@/shared/components/PageBackNav";
import { PageSectionCard } from "@/shared/components/PageSectionCard";
import { PageCenteredSpin } from "@/shared/components/PageCenteredSpin";
import { ErrorState } from "@/shared/components/ErrorState";
import { RunJobModal } from "@/features/ops/components/RunJobModal";

const { Paragraph, Title } = Typography;

type DetailPayload = {
  observation: {
    id: string;
    fingerprint: string;
    trendDomain: string;
    sourceJobId: string;
    candidateIndex: number;
    topicTitle: string;
    createdAt: string;
  };
  job: {
    id: string;
    status: string;
    completedAt: string | null;
  };
  candidate: TrendCandidate | Record<string, unknown> | null;
};

export default function TrendTopicDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<DetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runContentOpen, setRunContentOpen] = useState(false);

  useDocumentTitle(data?.observation.topicTitle ?? "Chi tiết topic");

  useEffect(() => {
    if (!id) {
      setError("Thiếu id topic.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.trendTopic(id);
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Không tải được chi tiết topic.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <PageShell>
        <PageCenteredSpin tip="Đang tải chi tiết topic…" />
      </PageShell>
    );
  }

  if (error || !data) {
    return (
      <PageShell>
        <PageBackNav label="Danh sách topic" onBack={() => navigate("/trend-topics")} />
        <ErrorState message={error ?? "Không có dữ liệu."} />
      </PageShell>
    );
  }

  const { observation, job, candidate } = data;
  const c = candidate as TrendCandidate | null;
  const displayTopic = c?.topic ?? observation.topicTitle;
  const articles = resolveArticlesForTopic(c);

  return (
    <PageShell>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <PageBackNav label="Danh sách topic" onBack={() => navigate("/trend-topics")} />
        <AppPageHeader
          title={displayTopic}
          description="Một slot topic đã ghi nhận sau trend job; nội dung candidate lấy từ output job nguồn."
        />
        <PageSectionCard title="Metadata">
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Domain">{observation.trendDomain}</Descriptions.Item>
            <Descriptions.Item label="Fingerprint">
              <code style={{ fontSize: 12, wordBreak: "break-all" }}>{observation.fingerprint}</code>
            </Descriptions.Item>
            <Descriptions.Item label="Chỉ số candidate">{observation.candidateIndex}</Descriptions.Item>
            <Descriptions.Item label="Ghi lúc">
              {new Date(observation.createdAt).toLocaleString("vi-VN")}
            </Descriptions.Item>
            <Descriptions.Item label="Job trend">
              <Space wrap>
                <Link to={`/jobs/${job.id}`}>{job.id.slice(0, 8)}…</Link>
                <Tag>{job.status}</Tag>
                {job.completedAt ? (
                  <span style={{ fontSize: 12, color: "var(--ant-color-text-secondary)" }}>
                    Hoàn thành: {new Date(job.completedAt).toLocaleString("vi-VN")}
                  </span>
                ) : null}
              </Space>
            </Descriptions.Item>
          </Descriptions>
          <Space wrap style={{ marginTop: 8 }}>
            <Link to={`/jobs/${job.id}`}>Mở đầy đủ job trend →</Link>
            <Button type="primary" onClick={() => setRunContentOpen(true)}>
              Chạy pipeline nội dung từ topic này
            </Button>
          </Space>
        </PageSectionCard>

        {!c ? (
          <Alert
            type="warning"
            showIcon
            message="Không đọc được candidate từ job output"
            description="Có thể output đã đổi hoặc bị xoá. Vẫn xem được metadata và job ở trên."
          />
        ) : (
          <PageSectionCard title="Nội dung topic (từ job)">
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <div>
                <Title level={5} style={{ marginBottom: 8 }}>
                  {displayTopic}
                </Title>
                <Space wrap size={[4, 4]}>
                  <Tag color="processing">{c.sourceCount ?? "—"} nguồn</Tag>
                  {(c.sources ?? []).map((s) => (
                    <Tag key={s}>{s}</Tag>
                  ))}
                </Space>
              </div>
              <Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 14 }}>
                {stripHtml(c.aggregatedBody ?? "") || "—"}
              </Paragraph>
              <TopicArticlesBlock articles={articles} />
              {articles.length === 0 ? (
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  Không có URL/tiêu đề bài trong output (job cũ hoặc thiếu raw URL).
                </Paragraph>
              ) : null}
            </Space>
          </PageSectionCard>
        )}

        <RunJobModal
          open={runContentOpen}
          onClose={() => setRunContentOpen(false)}
          initialTrendJobId={observation.sourceJobId}
          initialTopicIndex={observation.candidateIndex}
        />
      </Space>
    </PageShell>
  );
}
