import { useParams, useNavigate } from "react-router-dom";
import { Button, Card, Alert, Spin, Collapse, Space } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useExperimentDetail } from "../hooks/useExperimentDetail";
import { StatusTag } from "../components/StatusTag";
import { SemanticsNote } from "../components/SemanticsNote";
import { WinnerSuggestionCard } from "../components/WinnerSuggestionCard";
import { ExperimentArmsTable } from "../components/ExperimentArmsTable";
import { Empty } from "antd";

export default function ExperimentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { meta, data, loading, error, reload, start, pause, complete, promote } =
    useExperimentDetail(id);

  if (loading && !data) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/experiments")}
          style={{ marginBottom: 16 }}
        >
          Back
        </Button>
        <Alert
          type="error"
          message={error ?? "Not found"}
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

  const controlArm = data.controlArm;
  const winner = data.winnerSuggestion;
  const winnerArm = winner
    ? data.arms.find((a) => a.armId === winner.armId)
    : null;
  const sampleSufficient =
    winnerArm ? winnerArm.sampleCount >= data.minSampleForWinner : false;
  const guardResults = winnerArm?.guardResults;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate("/experiments")}
        style={{ alignSelf: "flex-start" }}
      >
        Back to Experiments
      </Button>

      {/* Header */}
      <Card title="Experiment Info">
        <p>
          <strong>Name:</strong> {meta?.name ?? data.experimentId}
        </p>
        <p>
          <strong>ID:</strong> {data.experimentId}
        </p>
        <p>
          <strong>Node Type:</strong> {meta?.nodeType ?? "—"}
        </p>
        <p>
          <strong>Scope:</strong> {meta?.scope ?? "—"}
          {meta?.scopeValue ? ` (${meta.scopeValue})` : ""}
        </p>
        <p>
          <strong>Status:</strong> {meta ? <StatusTag status={meta.status} /> : "—"}
        </p>
        <p>
          <strong>Cohort:</strong> {data.cohortBy} — {data.note}
        </p>
        <p>
          <strong>Control:</strong>{" "}
          {controlArm
            ? `${controlArm.name} (${controlArm.armId})`
            : "First arm"}
        </p>

        {/* Action buttons */}
        <Space style={{ marginTop: 16 }}>
          {(meta?.status === "draft" || meta?.status === "paused") && (
            <Button type="primary" onClick={() => start()}>
              Start
            </Button>
          )}
          {meta?.status === "running" && (
            <Button onClick={() => pause()}>Pause</Button>
          )}
          <Button onClick={() => complete()}>Complete</Button>
          {winner && (
            <Button
              type="primary"
              onClick={() => promote(winner.armId)}
              style={{ borderColor: "#52c41a" }}
            >
              Promote Winner
            </Button>
          )}
        </Space>
      </Card>

      {/* Semantics notes */}
      <SemanticsNote
        semantics={{
          cohortBy: data.cohortBy,
          reviewScoreScale: data.avgReviewScoreScale ?? "0..1",
          smoothedCtrFormula: "(clicks + 1) / (views + 10)",
        }}
      />

      {/* Winner suggestion */}
      {winner && (
        <WinnerSuggestionCard
          winner={winner}
          sampleSufficient={sampleSufficient}
          guardResults={guardResults}
        />
      )}

      {/* Arms comparison */}
      <Card title="Arms Comparison">
        <ExperimentArmsTable dataSource={data.arms} loading={loading} />
      </Card>

      {/* Daily trend - conditional: no backend support yet */}
      <Card title="Daily Trend by Arm">
        <Empty
          description="Backend chưa trả daily breakdown. Khi API có dailyByArm sẽ hiển thị chart."
        />
      </Card>

      {/* Raw metadata collapsible */}
      <Collapse
        items={[
          {
            key: "metadata",
            label: "Raw Metadata",
            children: (
              <pre style={{ fontSize: 11, overflow: "auto" }}>
                {JSON.stringify(
                  {
                    experimentId: data.experimentId,
                    minSampleForWinner: data.minSampleForWinner,
                    controlArm: data.controlArm,
                    winnerSuggestion: data.winnerSuggestion,
                  },
                  null,
                  2
                )}
              </pre>
            ),
          },
        ]}
      />
    </div>
  );
}
