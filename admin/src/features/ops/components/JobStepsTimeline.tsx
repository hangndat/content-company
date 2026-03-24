import { useMemo, useState } from "react";
import { Button, Collapse, Typography } from "antd";
import type { JobDetailResponse } from "@/features/ops/models/job";

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
  aggregate: "Aggregate (Jaccard)",
  embedRefine: "Embed refine",
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
    case "aggregate": {
      const tc = data.trendCandidates as unknown[] | undefined;
      return (
        <div>
          <Text strong>Topic candidates: </Text>
          {tc?.length ?? 0}
          {tc && tc.length > 0 ? (
            <pre style={{ fontSize: 12, overflow: "auto", maxHeight: 200, marginTop: 8 }}>
              {JSON.stringify(
                tc.map((c) => (typeof c === "object" && c && "topic" in c ? (c as { topic: string }).topic : c)),
                null,
                2
              )}
            </pre>
          ) : null}
        </div>
      );
    }
    case "embedRefine": {
      const tc = data.trendCandidates as unknown[] | undefined;
      return (
        <div>
          <Text strong>Sau embed/refine: </Text>
          {tc?.length ?? 0} topic
          {tc && tc.length > 0 ? (
            <ul style={{ marginTop: 8, paddingLeft: 18 }}>
              {tc.slice(0, 12).map((c, i) => (
                <li key={i}>
                  {typeof c === "object" && c && "topic" in c
                    ? String((c as { topic: string }).topic)
                    : JSON.stringify(c)}
                  {typeof c === "object" && c && "embeddingModel" in c && (c as { embeddingModel?: string }).embeddingModel
                    ? ` — ${(c as { embeddingModel: string }).embeddingModel}`
                    : ""}
                </li>
              ))}
              {(tc.length ?? 0) > 12 ? <li>…</li> : null}
            </ul>
          ) : null}
        </div>
      );
    }
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

type TimelineRow = {
  collapseKey: string;
  step: string;
  label: string;
  createdAt: string;
  data: Record<string, unknown>;
};

interface JobStepsTimelineProps {
  detail: JobDetailResponse | null;
}

export function JobStepsTimeline({ detail }: JobStepsTimelineProps) {
  const { allSteps, defaultActiveKey } = useMemo(() => {
    if (!detail) {
      return { allSteps: [] as TimelineRow[], defaultActiveKey: [] as string[] };
    }

    const { input, steps, job } = detail;
    const rawItems = input?.rawPayload?.rawItems ?? [];

    const built: TimelineRow[] = [
      {
        collapseKey: "__input",
        step: "input",
        label: STEP_LABELS.input,
        createdAt: job.createdAt,
        data: { rawItems },
      },
      ...steps.map((s) => ({
        collapseKey: s.id,
        step: s.step,
        label: STEP_LABELS[s.step] ?? s.step,
        createdAt: s.createdAt,
        data: s.stateJson as Record<string, unknown>,
      })),
    ];

    const keys = built.map((r) => r.collapseKey);
    const failed = job.status === "failed";
    const lastKey = keys[keys.length - 1];
    const active = failed || !lastKey ? keys : ["__input", lastKey];

    return { allSteps: built, defaultActiveKey: active };
  }, [detail]);

  if (!detail) return null;

  return (
    <Collapse
      defaultActiveKey={defaultActiveKey}
      items={allSteps.map((s) => ({
        key: s.collapseKey,
        label: (
          <span>
            <Text strong>{s.label}</Text>
            <Text type="secondary" style={{ marginLeft: 8, fontWeight: 400 }}>
              · {new Date(s.createdAt).toLocaleString("vi-VN")}
            </Text>
            {s.step === "input" && (s.data.rawItems as unknown[] | undefined)?.length != null && (
              <Text type="secondary" style={{ marginLeft: 8 }}>
                ({(s.data.rawItems as unknown[]).length} items)
              </Text>
            )}
            {s.step === "normalize" && (s.data.normalizedItems as unknown[] | undefined)?.length != null && (
              <Text type="secondary" style={{ marginLeft: 8 }}>
                ({(s.data.normalizedItems as unknown[]).length} items)
              </Text>
            )}
          </span>
        ),
        children: (
          <div style={{ padding: "8px 0" }}>
            <StepContent step={s.step} data={s.data} />
          </div>
        ),
      }))}
    />
  );
}
