import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  App,
  Button,
  Dropdown,
  Space,
  Typography,
  Tag,
  Descriptions,
  Divider,
  Tabs,
  Table,
} from "antd";
import { DownOutlined, ExportOutlined } from "@ant-design/icons";
import type { TrendCandidate } from "@/features/ops/models/job";
import { useJobDetail } from "@/features/ops/hooks/useJobDetail";
import { JobStepsTimeline } from "@/features/ops/components/JobStepsTimeline";
import { TrendCandidatesSection } from "@/features/ops/components/TrendCandidatesSection";
import { RunJobModal } from "@/features/ops/components/RunJobModal";
import { StatusTag } from "@/features/ops/components/StatusTag";
import { TREND_REPLAY_LABELS, TREND_REPLAY_STEPS } from "@/features/ops/constants/trendPipeline";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { ErrorState } from "@/shared/components/ErrorState";
import { PageShell } from "@/shared/components/PageShell";
import { PageBackNav } from "@/shared/components/PageBackNav";
import { PageSectionCard } from "@/shared/components/PageSectionCard";
import { PageCenteredSpin } from "@/shared/components/PageCenteredSpin";
import { formatJobDuration } from "@/features/ops/utils/formatJobDuration";
import { ExpandablePreText } from "@/features/ops/components/ExpandablePreText";

const { Text } = Typography;

const langfuseUiBase = (import.meta as { env?: { VITE_LANGFUSE_UI_PUBLIC_URL?: string } }).env
  ?.VITE_LANGFUSE_UI_PUBLIC_URL;

function approvalActionLabel(action: string): string {
  if (action === "approve") return "Duyệt";
  if (action === "reject") return "Từ chối";
  return action;
}

function hasSnapshotStep(detail: { steps: { step: string }[] } | null, step: string): boolean {
  return detail?.steps.some((s) => s.step === step) ?? false;
}

export default function JobDetailPage() {
  const { modal, message } = App.useApp();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { detail, loading, error, reload, approve, reject, replay } = useJobDetail(id);
  const [trendContentOpen, setTrendContentOpen] = useState(false);
  const [trendTopicIndex, setTrendTopicIndex] = useState<number | undefined>(undefined);

  useDocumentTitle(id ? `Job ${id.slice(0, 8)}…` : "Chi tiết job");

  const handleApprove = () => {
    modal.confirm({
      title: "Duyệt job",
      content: "Xác nhận duyệt job này?",
      okText: "Duyệt",
      cancelText: "Hủy",
      onOk: () => approve("admin"),
    });
  };

  const handleReject = () => {
    modal.confirm({
      title: "Từ chối job",
      content: "Xác nhận từ chối job này?",
      okText: "Từ chối",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: () => reject("admin", "Rejected by admin"),
    });
  };

  if (loading && !detail) {
    return (
      <PageShell>
        <PageCenteredSpin tip="Đang tải chi tiết job…" />
      </PageShell>
    );
  }

  if (error || !detail) {
    return (
      <PageShell>
        <PageBackNav label="Quay lại danh sách job" onBack={() => navigate("/jobs")} />
        <ErrorState message={error ?? "Không tìm thấy job."} onRetry={reload} />
      </PageShell>
    );
  }

  const { job } = detail;
  const isReviewRequired = job.decision === "REVIEW_REQUIRED";
  const isCompleted = job.status === "completed";
  const isTrendJob = job.sourceType === "trend_aggregate";
  const trendCandidates = (job.output?.trendCandidates ?? []) as TrendCandidate[];
  const rawItemCount = detail.input?.rawPayload?.rawItems?.length ?? 0;
  const norm = detail.input?.normalizedSummary;
  const channelLabel = norm?.channel
    ? [norm.channel.type, norm.channel.id].filter(Boolean).join(" · ") || "—"
    : "—";
  const langfuseTraceUrl =
    langfuseUiBase && job.traceId
      ? `${langfuseUiBase.replace(/\/$/, "")}/trace/${encodeURIComponent(job.traceId)}`
      : undefined;
  const out = job.output;
  const hasFinalOutput = Boolean(
    out &&
      ((out.outline?.trim()?.length ?? 0) > 0 ||
        (out.draft?.trim()?.length ?? 0) > 0 ||
        (out.reviewNotes?.trim()?.length ?? 0) > 0)
  );
  const finalTabItems: { key: string; label: string; children: React.ReactNode }[] = [];
  if (out?.outline?.trim()) {
    finalTabItems.push({
      key: "outline",
      label: "Outline",
      children: <ExpandablePreText text={out.outline} maxChars={1200} />,
    });
  }
  if (out?.draft?.trim()) {
    finalTabItems.push({
      key: "draft",
      label: "Draft",
      children: <ExpandablePreText text={out.draft} maxChars={1200} />,
    });
  }
  if (out?.reviewNotes?.trim()) {
    finalTabItems.push({
      key: "review",
      label: "Ghi chú review",
      children: <ExpandablePreText text={out.reviewNotes} maxChars={800} />,
    });
  }

  return (
    <PageShell>
      <PageBackNav label="Quay lại danh sách job" onBack={() => navigate("/jobs")} />

      <PageSectionCard
        title={isTrendJob ? "Job trend (aggregate)" : "Thông tin job"}
        extra={
          isTrendJob ? (
            <Tag color="purple" style={{ margin: 0 }}>
              trend_aggregate
            </Tag>
          ) : undefined
        }
      >
        <Descriptions column={{ xs: 1, sm: 1, md: 2 }} size="small" bordered>
          <Descriptions.Item label="Job ID" span={2}>
            <Text copyable>{job.jobId}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Trace ID" span={2}>
            <Space wrap>
              <Text copyable={{ text: job.traceId }}>{job.traceId}</Text>
              {langfuseTraceUrl ? (
                <Button
                  type="link"
                  size="small"
                  href={langfuseTraceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  icon={<ExportOutlined />}
                  style={{ padding: 0 }}
                >
                  Mở Langfuse
                </Button>
              ) : null}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Trạng thái">
            <StatusTag status={job.status} />
          </Descriptions.Item>
          <Descriptions.Item label="Quyết định">
            {job.decision ? <StatusTag status={job.decision} /> : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Topic score">
            {job.scores?.topicScore != null ? Number(job.scores.topicScore).toFixed(4) : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Review score">
            {job.scores?.reviewScore != null ? Number(job.scores.reviewScore).toFixed(4) : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Retry">{job.retryCount}</Descriptions.Item>
          <Descriptions.Item label="Thời lượng">
            {formatJobDuration(job.createdAt, job.completedAt, job.status)}
          </Descriptions.Item>
          <Descriptions.Item label="Loại nguồn">{job.sourceType}</Descriptions.Item>
          {norm?.domain ? <Descriptions.Item label="Trend domain">{norm.domain}</Descriptions.Item> : null}
          {norm?.channel?.id != null || norm?.channel?.type != null ? (
            <Descriptions.Item label="Kênh (normalized)">{channelLabel}</Descriptions.Item>
          ) : null}
          {norm?.rawItemsCount != null ? (
            <Descriptions.Item label="Số bài (normalized)">{norm.rawItemsCount}</Descriptions.Item>
          ) : null}
          <Descriptions.Item label="Tạo lúc">{new Date(job.createdAt).toLocaleString("vi-VN")}</Descriptions.Item>
          <Descriptions.Item label="Hoàn thành" span={2}>
            {job.completedAt ? new Date(job.completedAt).toLocaleString("vi-VN") : "—"}
          </Descriptions.Item>
        </Descriptions>

        <Divider style={{ margin: "16px 0" }} />

        <Space wrap>
          {isReviewRequired && (
            <>
              <Button type="primary" onClick={handleApprove}>
                Duyệt
              </Button>
              <Button danger onClick={handleReject}>
                Từ chối
              </Button>
            </>
          )}
          {isTrendJob ? (
            <Dropdown
              menu={{
                items: TREND_REPLAY_STEPS.map((step) => ({
                  key: step,
                  disabled:
                    step === "aggregate"
                      ? !hasSnapshotStep(detail, "normalize")
                      : step === "embedRefine"
                        ? !hasSnapshotStep(detail, "aggregate")
                        : false,
                  label: TREND_REPLAY_LABELS[step],
                  onClick: async () => {
                    try {
                      await replay(step === "normalize" ? undefined : step);
                      message.success("Đã gửi replay.");
                    } catch {
                      message.error("Replay thất bại.");
                    }
                  },
                })),
              }}
            >
              <Button>
                Chạy lại trend… <DownOutlined />
              </Button>
            </Dropdown>
          ) : (
            !isCompleted && <Button onClick={() => replay()}>Chạy lại (replay)</Button>
          )}
          {isTrendJob && isCompleted && id ? (
            <Button
              type="primary"
              ghost
              onClick={() => {
                setTrendTopicIndex(undefined);
                setTrendContentOpen(true);
              }}
            >
              Chạy pipeline nội dung từ trend này
            </Button>
          ) : null}
        </Space>
      </PageSectionCard>

      {hasFinalOutput && finalTabItems.length > 0 ? (
        <PageSectionCard title="Kết quả cuối (output)">
          <Tabs items={finalTabItems} />
        </PageSectionCard>
      ) : null}

      {detail.contentDraft ? (
        <PageSectionCard title="Draft (entity content_draft)">
          <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
            Bản ghi lưu khi content pipeline xong; đồng bộ với <code>JobOutput</code> (outline / draft /
            review).
            {id ? (
              <>
                {" "}
                <Link to={`/content-drafts?jobId=${encodeURIComponent(id)}`}>Xem trong danh sách draft</Link>
              </>
            ) : null}
          </Text>
          <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Draft ID" span={2}>
              <Text copyable>{detail.contentDraft.id}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Quyết định (snapshot)">
              {detail.contentDraft.decision ?? "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Topic / Review (snapshot)">
              T {detail.contentDraft.scores.topicScore?.toFixed(4) ?? "—"} · R{" "}
              {detail.contentDraft.scores.reviewScore?.toFixed(4) ?? "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Tạo entity">
              {new Date(detail.contentDraft.createdAt).toLocaleString("vi-VN")}
            </Descriptions.Item>
            <Descriptions.Item label="Cập nhật entity">
              {new Date(detail.contentDraft.updatedAt).toLocaleString("vi-VN")}
            </Descriptions.Item>
          </Descriptions>
        </PageSectionCard>
      ) : null}

      {isTrendJob && (
        <TrendCandidatesSection
          candidates={trendCandidates}
          rawItemCount={rawItemCount}
          onRunContentForTopic={
            id
              ? (topicIndex) => {
                  setTrendTopicIndex(topicIndex);
                  setTrendContentOpen(true);
                }
              : undefined
          }
        />
      )}

      {id ? (
        <RunJobModal
          open={trendContentOpen}
          onClose={() => setTrendContentOpen(false)}
          initialTrendJobId={id}
          initialTopicIndex={trendTopicIndex ?? null}
        />
      ) : null}

      <PageSectionCard title="Lịch sử duyệt">
        {detail.approvals.length === 0 ? (
          <Text type="secondary">Chưa có bản ghi duyệt / từ chối.</Text>
        ) : (
          <Table
            size="small"
            rowKey="id"
            pagination={false}
            dataSource={detail.approvals}
            columns={[
              {
                title: "Thời điểm",
                dataIndex: "createdAt",
                key: "createdAt",
                width: 180,
                render: (v: string) => new Date(v).toLocaleString("vi-VN"),
              },
              {
                title: "Hành động",
                dataIndex: "action",
                key: "action",
                width: 120,
                render: (a: string) => approvalActionLabel(a),
              },
              { title: "Actor", dataIndex: "actor", key: "actor", width: 140 },
              { title: "Lý do", dataIndex: "reason", key: "reason", ellipsis: true },
            ]}
          />
        )}
      </PageSectionCard>

      <PageSectionCard title="Các bước pipeline">
        <JobStepsTimeline detail={detail} />
      </PageSectionCard>
    </PageShell>
  );
}
