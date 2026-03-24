import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Alert,
  App,
  Button,
  Checkbox,
  Col,
  Collapse,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Typography,
} from "antd";
import { Navigate, Link, useNavigate, useParams } from "react-router-dom";
import { ExperimentOutlined, PlayCircleOutlined, SaveOutlined, ReloadOutlined } from "@ant-design/icons";
import { api } from "@/lib/api";
import { getAgent, isAgentType } from "@/features/ops/constants/agents";
import type { JobDetailResponse, JobListItem } from "@/features/ops/models/job";
import {
  buildComparisonHints,
  buildDryRunSnapshotOptions,
  buildPlaceholderPreview,
  extractPipelineBaseline,
  getStateForSnapshotStep,
  latestRecordedPipelineStep,
  preferredSnapshotStepForAgent,
} from "@/features/ops/utils/promptDryRun";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { AppPageHeader } from "@/shared/components/AppPageHeader";
import { PageBackNav } from "@/shared/components/PageBackNav";
import { PageSectionCard } from "@/shared/components/PageSectionCard";
import { PageShell } from "@/shared/components/PageShell";

const { Text, Paragraph } = Typography;

export default function PromptTuningPage() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();

  if (!type || !isAgentType(type)) {
    return <Navigate to="/agents" replace />;
  }

  const agent = getAgent(type)!;
  useDocumentTitle(`Thử prompt — ${agent.nameVi}`);

  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobId, setJobId] = useState<string | undefined>();
  const [jobDetail, setJobDetail] = useState<JobDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [snapshotStep, setSnapshotStep] = useState<string | undefined>();
  const [promptContent, setPromptContent] = useState("");
  const [promptLoading, setPromptLoading] = useState(true);
  const [dryRunLoading, setDryRunLoading] = useState(false);
  const [dryRunOutput, setDryRunOutput] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveActive, setSaveActive] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const loadJobs = useCallback(() => {
    setJobsLoading(true);
    api
      .jobs({ limit: 100 })
      .then((r) => {
        const raw = Array.isArray(r.items) ? r.items : [];
        const trendish = (s: string) => s === "trend_aggregate" || s === "trend";
        setJobs(
          [...raw].sort((a, b) => {
            const da = trendish(a.sourceType) ? 1 : 0;
            const db = trendish(b.sourceType) ? 1 : 0;
            if (da !== db) return da - db;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          })
        );
      })
      .catch((err) => {
        setJobs([]);
        message.error(err instanceof Error ? err.message : "Không tải danh sách job.");
      })
      .finally(() => setJobsLoading(false));
  }, [message]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const loadActivePrompt = useCallback(async () => {
    setPromptLoading(true);
    try {
      const list = await api.promptsByType(type);
      const active = list.find((p) => p.isActive);
      setPromptContent(active?.content ?? list[0]?.content ?? "");
    } catch {
      setPromptContent("");
      message.warning("Không tải được prompt từ API.");
    } finally {
      setPromptLoading(false);
    }
  }, [type, message]);

  useEffect(() => {
    void loadActivePrompt();
  }, [loadActivePrompt]);

  useEffect(() => {
    if (!jobId) {
      setJobDetail(null);
      setSnapshotStep(undefined);
      return;
    }
    setJobDetail(null);
    setSnapshotStep(undefined);
    let cancel = false;
    setDetailLoading(true);
    api
      .jobDetail(jobId)
      .then((d) => {
        if (!cancel) {
          setJobDetail(d);
          const opts = buildDryRunSnapshotOptions(type, d.steps);
          setSnapshotStep(preferredSnapshotStepForAgent(type, opts));
        }
      })
      .catch(() => {
        if (!cancel) {
          setJobDetail(null);
          setSnapshotStep(undefined);
        }
      })
      .finally(() => {
        if (!cancel) setDetailLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [jobId, type]);

  const snapshotOptionList = useMemo(
    () => (jobDetail ? buildDryRunSnapshotOptions(type, jobDetail.steps) : []),
    [jobDetail, type]
  );

  const snapshotSelectOptions = useMemo(
    () => snapshotOptionList.map((o) => ({ value: o.value, label: o.label })),
    [snapshotOptionList]
  );

  const latestJobStep = useMemo(
    () => (jobDetail ? latestRecordedPipelineStep(jobDetail.steps) : undefined),
    [jobDetail]
  );

  const activeSnapshotLabel = useMemo(() => {
    if (!snapshotStep) return undefined;
    return snapshotOptionList.find((o) => o.value === snapshotStep)?.label ?? snapshotStep;
  }, [snapshotStep, snapshotOptionList]);

  const snapshotState = useMemo(() => {
    if (!jobDetail || !snapshotStep) return null;
    return getStateForSnapshotStep(jobDetail.steps, snapshotStep);
  }, [jobDetail, snapshotStep]);

  const inputPreview = useMemo(() => {
    if (!snapshotState) return [];
    return buildPlaceholderPreview(type, snapshotState);
  }, [snapshotState, type]);

  /** Kết quả đã persist sau bước agent này trên job (để đối chiếu dry-run). */
  const pipelineBaseline = useMemo(
    () => (jobDetail ? extractPipelineBaseline(type, jobDetail.steps) : null),
    [jobDetail, type]
  );

  const comparisonHints = useMemo(() => {
    if (dryRunOutput === null) return [];
    return buildComparisonHints(type, dryRunOutput, pipelineBaseline);
  }, [type, dryRunOutput, pipelineBaseline]);

  const handleDryRun = async () => {
    if (!promptContent.trim()) {
      message.warning("Nhập nội dung prompt.");
      return;
    }
    if (!jobId || !snapshotStep) {
      message.warning("Chọn job và đợi hệ thống chọn snapshot, hoặc job không đủ dữ liệu.");
      return;
    }
    setDryRunLoading(true);
    setDryRunOutput(null);
    try {
      const res = await api.dryRunPrompt(type, {
        sourceJobId: jobId,
        snapshotStep,
        promptContent,
      });
      setDryRunOutput(res.output);
      message.success("Đã chạy thử.");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Dry-run thất bại.");
    } finally {
      setDryRunLoading(false);
    }
  };

  const handleSave = async () => {
    if (!promptContent.trim()) {
      message.warning("Không có nội dung để lưu.");
      return;
    }
    setSaveLoading(true);
    try {
      await api.createPrompt(type, { content: promptContent, setActive: saveActive });
      message.success("Đã tạo phiên bản prompt.");
      setSaveOpen(false);
      setSaveActive(false);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Lưu thất bại.");
    } finally {
      setSaveLoading(false);
    }
  };

  const agentHref = `/agents/${type}`;
  const experimentsHref = `/experiments?nodeType=${encodeURIComponent(type)}`;

  return (
    <PageShell>
      <PageBackNav label={`Agent: ${agent.nameVi}`} onBack={() => navigate(agentHref)} />
      <AppPageHeader
        title={`Phòng thử prompt — ${agent.nameVi}`}
        description={`Chọn job thật, xem input đổ vào {{placeholder}}, chỉnh template, chạy dry-run và lưu phiên bản mới khi ổn.`}
        extra={
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={() => void loadActivePrompt()} loading={promptLoading}>
              Tải lại prompt đang dùng
            </Button>
            <Link to={experimentsHref}>
              <Button icon={<ExperimentOutlined />}>Thử nghiệm A/B</Button>
            </Link>
            <Link to={agentHref}>
              <Button type="default">Chi tiết agent</Button>
            </Link>
          </Space>
        }
      />

      <Row gutter={[16, 16]} align="stretch">
        <Col xs={24} lg={9}>
          <PageSectionCard title="1 · Job">
            <Select
              showSearch
              allowClear
              placeholder={jobsLoading ? "Đang tải job…" : "Chọn job đã chạy"}
              style={{ width: "100%" }}
              loading={jobsLoading}
              options={jobs.map((j) => ({
                value: j.id,
                label: `${j.id.slice(0, 8)}… · ${j.sourceType}${
                  j.sourceType === "trend_aggregate" || j.sourceType === "trend" ? " (trend)" : ""
                } · ${new Date(j.createdAt).toLocaleString("vi-VN")}`,
              }))}
              optionFilterProp="label"
              value={jobId}
              onChange={(v) => {
                setJobId(v);
                setDryRunOutput(null);
              }}
            />
            <Paragraph type="secondary" style={{ marginTop: 10, marginBottom: 0, fontSize: 13 }}>
              Job trend thường không đủ bước nội dung cho agent này. Cần job từ <code>content/run</code> để có snapshot
              phù hợp.
            </Paragraph>
          </PageSectionCard>

          <div style={{ marginTop: 16 }}>
            <PageSectionCard title="2 · Snapshot (tự chọn theo agent)">
              {!jobId ? (
                <Text type="secondary">Chọn job để xem tiến độ và snapshot mặc định.</Text>
              ) : detailLoading ? (
                <Text type="secondary">Đang tải chi tiết job…</Text>
              ) : jobDetail && snapshotOptionList.length > 0 && snapshotStep ? (
                <>
                  <Paragraph style={{ marginBottom: 8, fontSize: 13 }}>
                    Snapshot cuối trong DB: <Text code>{latestJobStep ?? "—"}</Text>
                    <br />
                    Dry-run dùng sau bước: <Text strong>{activeSnapshotLabel}</Text>
                  </Paragraph>
                  <Collapse
                    ghost
                    size="small"
                    items={[
                      {
                        key: "snap",
                        label: "Đổi snapshot khác",
                        children: (
                          <Select
                            style={{ width: "100%" }}
                            options={snapshotSelectOptions}
                            value={snapshotStep}
                            onChange={(v) => setSnapshotStep(v)}
                          />
                        ),
                      },
                    ]}
                  />
                </>
              ) : (
                <Text type="warning">
                  Job không có snapshot phù hợp agent <Text code>{type}</Text>.
                </Text>
              )}
            </PageSectionCard>
          </div>

          <div style={{ marginTop: 16 }}>
            <PageSectionCard title="3 · Input (sau khi chọn job)">
              {!jobId ? (
                <Text type="secondary">Chưa chọn job.</Text>
              ) : detailLoading ? (
                <Text type="secondary">Đang tải…</Text>
              ) : !snapshotState || inputPreview.length === 0 ? (
                <Text type="secondary">Chưa có dữ liệu preview (thiếu snapshot hoặc state rỗng).</Text>
              ) : (
                <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                  {inputPreview.map((block) => (
                    <div key={block.key}>
                      <Text strong>
                        <code>{`{{${block.label}}}`}</code>
                      </Text>
                      <pre
                        style={{
                          marginTop: 6,
                          marginBottom: 0,
                          maxHeight: 220,
                          overflow: "auto",
                          padding: 10,
                          background: "#fafafa",
                          borderRadius: 6,
                          fontSize: 12,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        {block.content}
                      </pre>
                    </div>
                  ))}
                </Space>
              )}
            </PageSectionCard>
          </div>
        </Col>

        <Col xs={24} lg={15}>
          <PageSectionCard title="4 · Template prompt">
            <Input.TextArea
              value={promptContent}
              onChange={(e) => setPromptContent(e.target.value)}
              placeholder="Nội dung prompt với {{PLACEHOLDER}}…"
              autoSize={{ minRows: 14, maxRows: 28 }}
              style={{ fontFamily: "monospace", fontSize: 13 }}
              disabled={promptLoading}
            />
            <Space wrap style={{ marginTop: 12 }}>
              <Text type="secondary">Placeholder:</Text>
              {agent.placeholders.map((p) => (
                <Text key={p} code>
                  {`{{${p}}}`}
                </Text>
              ))}
            </Space>
            <Space wrap style={{ marginTop: 16 }}>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                loading={dryRunLoading}
                onClick={() => void handleDryRun()}
              >
                Chạy thử (dry-run)
              </Button>
              <Button icon={<SaveOutlined />} onClick={() => setSaveOpen(true)}>
                Lưu phiên bản mới…
              </Button>
            </Space>
          </PageSectionCard>

          <div style={{ marginTop: 16 }}>
            <PageSectionCard title="5 · Kết quả dry-run & so sánh pipeline">
              {dryRunOutput === null ? (
                <>
                  <Text type="secondary">Chưa chạy dry-run.</Text>
                  {pipelineBaseline ? (
                    <Paragraph type="secondary" style={{ fontSize: 13, marginTop: 10, marginBottom: 0 }}>
                      Job đã có snapshot sau bước <Text code>{type}</Text> — bấm &quot;Chạy thử&quot; để xem hai cột
                      (LLM mới vs kết quả đã lưu).
                    </Paragraph>
                  ) : jobId && jobDetail && !detailLoading ? (
                    <Paragraph type="warning" style={{ marginTop: 10, marginBottom: 0, fontSize: 13 }}>
                      Job chưa có snapshot sau <Text code>{type}</Text> — pipeline chưa chạy xong bước này nên không có
                      baseline để so.
                    </Paragraph>
                  ) : null}
                </>
              ) : (
                <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                  {comparisonHints.map((h, i) => (
                    <Alert key={i} type={h.type} showIcon message={h.message} />
                  ))}
                  <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 0 }}>
                    Cột phải: state đã ghi sau bước <Text code>{type}</Text> trên cùng job (replay lấy snapshot mới
                    nhất).
                  </Paragraph>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                      <Text strong>Dry-run (LLM vừa gọi)</Text>
                      <pre
                        style={{
                          marginTop: 8,
                          marginBottom: 0,
                          maxHeight: 420,
                          overflow: "auto",
                          padding: 12,
                          background: "#f6ffed",
                          border: "1px solid #b7eb8f",
                          borderRadius: 8,
                          fontSize: 13,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        {dryRunOutput}
                      </pre>
                    </Col>
                    <Col xs={24} md={12}>
                      <Text strong>Pipeline (đã lưu trên job)</Text>
                      {pipelineBaseline ? (
                        <>
                          <Text type="secondary" style={{ display: "block", fontSize: 12, marginTop: 4 }}>
                            {pipelineBaseline.label}
                          </Text>
                          <pre
                            style={{
                              marginTop: 8,
                              marginBottom: 0,
                              maxHeight: 420,
                              overflow: "auto",
                              padding: 12,
                              background: "#fafafa",
                              border: "1px solid #f0f0f0",
                              borderRadius: 8,
                              fontSize: 13,
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                            }}
                          >
                            {pipelineBaseline.displayText}
                          </pre>
                        </>
                      ) : (
                        <Alert
                          style={{ marginTop: 8 }}
                          type="warning"
                          showIcon
                          message="Không có baseline"
                          description={`Chưa có snapshot sau bước "${type}" — chỉ xem cột dry-run.`}
                        />
                      )}
                    </Col>
                  </Row>
                </Space>
              )}
            </PageSectionCard>
          </div>
        </Col>
      </Row>

      <Modal
        title={`Lưu phiên bản mới — ${type}`}
        open={saveOpen}
        onCancel={() => setSaveOpen(false)}
        onOk={() => void handleSave()}
        confirmLoading={saveLoading}
        okText="Lưu"
        width={560}
      >
        <Paragraph type="secondary" style={{ fontSize: 13 }}>
          Nội dung đồng bộ với ô template trên trang (chỉnh thêm tại đây nếu cần trước khi lưu).
        </Paragraph>
        <Input.TextArea
          rows={10}
          value={promptContent}
          onChange={(e) => setPromptContent(e.target.value)}
          style={{ fontFamily: "monospace", fontSize: 12 }}
        />
        <div style={{ marginTop: 12 }}>
          <Checkbox checked={saveActive} onChange={(e) => setSaveActive(e.target.checked)}>
            Đặt làm phiên bản đang dùng ngay
          </Checkbox>
        </div>
      </Modal>
    </PageShell>
  );
}
