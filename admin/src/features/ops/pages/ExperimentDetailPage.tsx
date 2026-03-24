import { useParams, useNavigate } from "react-router-dom";
import { Button, Collapse, Space, Descriptions, Divider, Empty } from "antd";
import { useExperimentDetail } from "@/features/ops/hooks/useExperimentDetail";
import { StatusTag } from "@/features/ops/components/StatusTag";
import { SemanticsNote } from "@/features/ops/components/SemanticsNote";
import { WinnerSuggestionCard } from "@/features/ops/components/WinnerSuggestionCard";
import { ExperimentArmsTable } from "@/features/ops/components/ExperimentArmsTable";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { ErrorState } from "@/shared/components/ErrorState";
import { PageShell } from "@/shared/components/PageShell";
import { PageBackNav } from "@/shared/components/PageBackNav";
import { PageSectionCard } from "@/shared/components/PageSectionCard";
import { PageTableCard } from "@/shared/components/PageTableCard";
import { PageCenteredSpin } from "@/shared/components/PageCenteredSpin";

export default function ExperimentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { meta, data, loading, error, reload, start, pause, complete, promote } =
    useExperimentDetail(id);

  useDocumentTitle(meta?.name ?? id ?? "Thử nghiệm");

  if (loading && !data) {
    return (
      <PageShell>
        <PageCenteredSpin tip="Đang tải chi tiết thử nghiệm…" />
      </PageShell>
    );
  }

  if (error || !data) {
    return (
      <PageShell>
        <PageBackNav label="Quay lại danh sách thử nghiệm" onBack={() => navigate("/experiments")} />
        <ErrorState message={error ?? "Không tìm thấy thử nghiệm."} onRetry={reload} />
      </PageShell>
    );
  }

  const controlArm = data.controlArm;
  const winner = data.winnerSuggestion;
  const winnerArm = winner ? data.arms.find((a) => a.armId === winner.armId) : null;
  const sampleSufficient = winnerArm ? winnerArm.sampleCount >= data.minSampleForWinner : false;
  const guardResults = winnerArm?.guardResults;

  return (
    <PageShell>
      <PageBackNav label="Quay lại danh sách thử nghiệm" onBack={() => navigate("/experiments")} />

      <PageSectionCard title="Thông tin thử nghiệm">
        <Descriptions column={{ xs: 1, md: 2 }} size="small" bordered>
          <Descriptions.Item label="Tên" span={2}>
            {meta?.name ?? data.experimentId}
          </Descriptions.Item>
          <Descriptions.Item label="ID" span={2}>
            {data.experimentId}
          </Descriptions.Item>
          <Descriptions.Item label="Node type">{meta?.nodeType ?? "—"}</Descriptions.Item>
          <Descriptions.Item label="Scope">
            {meta?.scope ?? "—"}
            {meta?.scopeValue ? ` (${meta.scopeValue})` : ""}
          </Descriptions.Item>
          <Descriptions.Item label="Trạng thái">
            {meta ? <StatusTag status={meta.status} /> : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Cohort">{data.cohortBy}</Descriptions.Item>
          <Descriptions.Item label="Ghi chú" span={2}>
            {data.note}
          </Descriptions.Item>
          <Descriptions.Item label="Nhánh control" span={2}>
            {controlArm ? `${controlArm.name} (${controlArm.armId})` : "Nhánh đầu tiên"}
          </Descriptions.Item>
        </Descriptions>

        <Divider style={{ margin: "16px 0" }} />

        <Space wrap>
          {(meta?.status === "draft" || meta?.status === "paused") && (
            <Button type="primary" onClick={() => start()}>
              Bắt đầu
            </Button>
          )}
          {meta?.status === "running" && <Button onClick={() => pause()}>Tạm dừng</Button>}
          <Button onClick={() => complete()}>Kết thúc</Button>
          {winner && (
            <Button type="primary" onClick={() => promote(winner.armId)} style={{ borderColor: "#52c41a" }}>
              Áp dụng nhánh thắng
            </Button>
          )}
        </Space>
      </PageSectionCard>

      <SemanticsNote
        semantics={{
          cohortBy: data.cohortBy,
          reviewScoreScale: data.avgReviewScoreScale ?? "0..1",
          smoothedCtrFormula: "(clicks + 1) / (views + 10)",
        }}
      />

      {winner && (
        <WinnerSuggestionCard
          winner={winner}
          sampleSufficient={sampleSufficient}
          guardResults={guardResults}
        />
      )}

      <PageTableCard title="So sánh các nhánh (arms)">
        <ExperimentArmsTable dataSource={data.arms} loading={loading} />
      </PageTableCard>

      <PageSectionCard title="Xu hướng theo ngày (theo arm)">
        <Empty description="Backend chưa trả daily breakdown. Khi API có dailyByArm sẽ hiển thị biểu đồ." />
      </PageSectionCard>

      <Collapse
        items={[
          {
            key: "metadata",
            label: "Metadata thô (debug)",
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
    </PageShell>
  );
}
