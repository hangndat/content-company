import { useState } from "react";
import { Button, Collapse, Typography } from "antd";
import type { JobDetailResponse } from "../models/job";

const { Text } = Typography;

function TruncatedText({
  text,
  maxLen,
  style,
}: {
  text: string;
  maxLen: number;
  style?: React.CSSProperties;
}) {
  const [expanded, setExpanded] = useState(false);
  const str = String(text || "");
  const truncated = str.length > maxLen;
  const display = expanded ? str : (truncated ? str.slice(0, maxLen) + "..." : str);
  return (
    <div>
      <Text style={{ whiteSpace: "pre-wrap", fontSize: 13, ...style }}>{display}</Text>
      {truncated && !expanded && (
        <Button type="link" size="small" onClick={() => setExpanded(true)} style={{ paddingLeft: 0 }}>
          Xem thêm
        </Button>
      )}
      {truncated && expanded && (
        <Button type="link" size="small" onClick={() => setExpanded(false)} style={{ paddingLeft: 0 }}>
          Thu gọn
        </Button>
      )}
    </div>
  );
}

const STEP_LABELS: Record<string, string> = {
  input: "Input / Ingest",
  normalize: "Normalize",
  planner: "Planner",
  scorer: "Scorer",
  writer: "Writer",
  reviewer: "Reviewer",
  decision: "Decision",
};

function StepContent({
  step,
  data,
}: {
  step: string;
  data: Record<string, unknown>;
}) {
  switch (step) {
    case "input":
      return (
        <pre style={{ fontSize: 12, overflow: "auto", maxHeight: 200 }}>
          {JSON.stringify(data.rawItems ?? data, null, 2)}
        </pre>
      );
    case "normalize":
      return (
        <pre style={{ fontSize: 12, overflow: "auto", maxHeight: 200 }}>
          {JSON.stringify(data.normalizedItems ?? {}, null, 2)}
        </pre>
      );
    case "planner":
      return (
        <TruncatedText text={String(data.outline ?? "")} maxLen={2000} />
      );
    case "scorer":
      return (
        <div>
          <Text strong>Topic Score: </Text>
          {data.topicScore != null ? Number(data.topicScore).toFixed(4) : "—"}
        </div>
      );
    case "writer":
      return (
        <TruncatedText text={String(data.draft ?? "")} maxLen={2000} />
      );
    case "reviewer":
      return (
        <div>
          <div>
            <Text strong>Review Score: </Text>
            {data.reviewScore != null ? String(Number(data.reviewScore).toFixed(4)) : "—"}
          </div>
          {data.reviewNotes ? (
            <div style={{ marginTop: 8 }}>
              <Text strong>Notes: </Text>
              <TruncatedText text={String(data.reviewNotes)} maxLen={500} />
            </div>
          ) : null}
        </div>
      );
    case "decision":
      return (
        <div>
          <Text strong>Decision: </Text>
          <Text type={data.decision === "APPROVED" ? "success" : data.decision === "REJECTED" ? "danger" : "warning"}>
            {String(data.decision ?? "—")}
          </Text>
        </div>
      );
    default:
      return (
        <pre style={{ fontSize: 11, overflow: "auto", maxHeight: 150 }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      );
  }
}

interface JobStepsTimelineProps {
  detail: JobDetailResponse | null;
}

export function JobStepsTimeline({ detail }: JobStepsTimelineProps) {
  if (!detail) return null;

  const { input, steps } = detail;
  const rawItems = input?.rawPayload?.rawItems ?? [];

  const allSteps: Array<{ key: string; label: string; data: Record<string, unknown> }> = [
    {
      key: "input",
      label: STEP_LABELS.input,
      data: { rawItems },
    },
    ...steps.map((s) => ({
      key: s.step,
      label: STEP_LABELS[s.step] ?? s.step,
      data: s.stateJson as Record<string, unknown>,
    })),
  ];

  return (
    <Collapse
      defaultActiveKey={allSteps.map((s) => s.key)}
      items={allSteps.map((s) => ({
        key: s.key,
        label: (
          <span>
            <Text strong>{s.label}</Text>
            {s.key === "input" && rawItems.length > 0 && (
              <Text type="secondary" style={{ marginLeft: 8 }}>
                ({rawItems.length} items)
              </Text>
            )}
            {s.key === "normalize" && (s.data.normalizedItems as unknown[] | undefined)?.length != null && (
              <Text type="secondary" style={{ marginLeft: 8 }}>
                ({(s.data.normalizedItems as unknown[]).length} items)
              </Text>
            )}
          </span>
        ),
        children: (
          <div style={{ padding: "8px 0" }}>
            <StepContent step={s.key} data={s.data} />
          </div>
        ),
      }))}
    />
  );
}
