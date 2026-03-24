import { useParams, useNavigate } from "react-router-dom";
import { Button, Card, Alert, Spin, Space, Typography, Modal } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useJobDetail } from "../hooks/useJobDetail";
import { JobStepsTimeline } from "../components/JobStepsTimeline";

const { Text } = Typography;

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { detail, loading, error, reload, approve, reject, replay } = useJobDetail(id);

  const handleApprove = () => {
    Modal.confirm({
      title: "Approve Job",
      content: "Approve this job?",
      onOk: () => approve("admin"),
    });
  };

  const handleReject = () => {
    Modal.confirm({
      title: "Reject Job",
      content: "Reject this job?",
      okText: "Reject",
      okButtonProps: { danger: true },
      onOk: () => reject("admin", "Rejected by admin"),
    });
  };

  if (loading && !detail) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/jobs")}
          style={{ marginBottom: 16 }}
        >
          Back
        </Button>
        <Alert
          type="error"
          message={error ?? "Job not found"}
          showIcon
          action={
            <a onClick={reload} style={{ marginLeft: 8 }}>
              Retry
            </a>
          }
        />
      </>
    );
  }

  const { job } = detail;
  const isReviewRequired = job.decision === "REVIEW_REQUIRED";
  const isCompleted = job.status === "completed";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate("/jobs")}
        style={{ alignSelf: "flex-start" }}
      >
        Back to Jobs
      </Button>

      {/* Header */}
      <Card title="Job Info">
        <p>
          <strong>Job ID:</strong> {job.jobId}
        </p>
        <p>
          <strong>Trace ID:</strong> {job.traceId}
        </p>
        <p>
          <strong>Status:</strong> {job.status}
        </p>
        <p>
          <strong>Decision:</strong>{" "}
          <Text
            type={
              job.decision === "APPROVED"
                ? "success"
                : job.decision === "REJECTED"
                  ? "danger"
                  : "warning"
            }
          >
            {job.decision ?? "—"}
          </Text>
        </p>
        <p>
          <strong>Topic Score:</strong>{" "}
          {job.scores?.topicScore != null
            ? Number(job.scores.topicScore).toFixed(4)
            : "—"}
        </p>
        <p>
          <strong>Review Score:</strong>{" "}
          {job.scores?.reviewScore != null
            ? Number(job.scores.reviewScore).toFixed(4)
            : "—"}
        </p>
        <p>
          <strong>Source Type:</strong> {job.sourceType}
        </p>
        <p>
          <strong>Created:</strong> {new Date(job.createdAt).toLocaleString()}
        </p>
        <p>
          <strong>Completed:</strong>{" "}
          {job.completedAt
            ? new Date(job.completedAt).toLocaleString()
            : "—"}
        </p>

        <Space style={{ marginTop: 16 }}>
          {isReviewRequired && (
            <>
              <Button type="primary" onClick={handleApprove}>
                Approve
              </Button>
              <Button danger onClick={handleReject}>
                Reject
              </Button>
            </>
          )}
          {!isCompleted && (
            <Button onClick={() => replay()}>Replay</Button>
          )}
        </Space>
      </Card>

      {/* Pipeline steps */}
      <Card title="Pipeline Steps">
        <JobStepsTimeline detail={detail} />
      </Card>
    </div>
  );
}
