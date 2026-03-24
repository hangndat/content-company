import { useParams, useNavigate } from "react-router-dom";
import { App, Button, Space, Typography, Tag, Descriptions, Divider } from "antd";
import type { TrendCandidate } from "@/features/ops/models/job";
import { useJobDetail } from "@/features/ops/hooks/useJobDetail";
import { JobStepsTimeline } from "@/features/ops/components/JobStepsTimeline";
import { TrendCandidatesSection } from "@/features/ops/components/TrendCandidatesSection";
import { StatusTag } from "@/features/ops/components/StatusTag";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { ErrorState } from "@/shared/components/ErrorState";
import { PageShell } from "@/shared/components/PageShell";
import { PageBackNav } from "@/shared/components/PageBackNav";
import { PageSectionCard } from "@/shared/components/PageSectionCard";
import { PageCenteredSpin } from "@/shared/components/PageCenteredSpin";

const { Text } = Typography;

export default function JobDetailPage() {
  const { modal } = App.useApp();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { detail, loading, error, reload, approve, reject, replay } = useJobDetail(id);

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
            <Text copyable={{ text: job.traceId }}>{job.traceId}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Trạng thái">
            <StatusTag status={job.status} />
          </Descriptions.Item>
          <Descriptions.Item label="Quyết định">
            {job.decision ? <StatusTag status={job.decision} /> : "—"}
          </Descriptions.Item>
          {!isTrendJob && (
            <>
              <Descriptions.Item label="Topic score">
                {job.scores?.topicScore != null ? Number(job.scores.topicScore).toFixed(4) : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Review score">
                {job.scores?.reviewScore != null ? Number(job.scores.reviewScore).toFixed(4) : "—"}
              </Descriptions.Item>
            </>
          )}
          <Descriptions.Item label="Loại nguồn">{job.sourceType}</Descriptions.Item>
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
          {!isCompleted && <Button onClick={() => replay()}>Chạy lại (replay)</Button>}
        </Space>
      </PageSectionCard>

      {isTrendJob && <TrendCandidatesSection candidates={trendCandidates} rawItemCount={rawItemCount} />}

      <PageSectionCard title="Các bước pipeline">
        <JobStepsTimeline detail={detail} />
      </PageSectionCard>
    </PageShell>
  );
}
