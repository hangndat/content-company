import { useNavigate } from "react-router-dom";
import { Alert, App, Typography } from "antd";
import { ModalForm, ProFormDependency, ProFormDigit, ProFormSelect, ProFormText } from "@ant-design/pro-components";
import { api } from "@/lib/api";
import { DEFAULT_CHANNEL_FIELDS } from "@/features/ops/constants/jobRunForm";
import { ProFormChannelFields } from "./ProFormChannelFields";
import { ProFormRawItemsList } from "./ProFormRawItemsList";
import { useOpsModalSubmit } from "@/features/ops/hooks/useOpsModalSubmit";
import { mapContentRawItemsForApi } from "@/features/ops/utils/mapRunJobPayload";
import { opsModalOpenChange, opsModalProps, opsModalSubmitter } from "@/features/ops/utils/opsModalForm";

type RunJobModalProps = {
  open: boolean;
  onClose: () => void;
  /** Mở modal với job trend + (tuỳ chọn) chỉ một candidate index */
  initialTrendJobId?: string;
  initialTopicIndex?: number | null;
};

export function RunJobModal({
  open,
  onClose,
  initialTrendJobId,
  initialTopicIndex,
}: RunJobModalProps) {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { submitting, guard } = useOpsModalSubmit();
  const trendIdTrimmed = initialTrendJobId?.trim() ?? "";

  return (
    <ModalForm
      title="Chạy job nội dung"
      open={open}
      width={560}
      modalProps={opsModalProps(onClose)}
      key={`${initialTrendJobId ?? ""}-${initialTopicIndex ?? ""}-${open}`}
      initialValues={{
        sourceType: "manual",
        publishPolicy: "review_only",
        ...DEFAULT_CHANNEL_FIELDS,
        rawItems: [{ title: "", body: "", url: "" }],
        trendJobId: initialTrendJobId ?? "",
        topicIndex: initialTopicIndex != null ? initialTopicIndex : undefined,
      }}
      onOpenChange={opsModalOpenChange(onClose)}
      submitter={opsModalSubmitter({ submitting, submitText: "Chạy", onClose })}
      onFinish={async (values) =>
        guard(async () => {
          try {
            const trendId = typeof values.trendJobId === "string" ? values.trendJobId.trim() : "";
            const useTrend = trendId.length > 0;
            const result = useTrend
              ? await api.runJob({
                  sourceType: "trend",
                  trendJobId: trendId,
                  topicIndex:
                    values.topicIndex !== undefined && values.topicIndex !== null && values.topicIndex !== ""
                      ? Number(values.topicIndex)
                      : undefined,
                  publishPolicy: values.publishPolicy,
                  channel: {
                    id: values.channelId,
                    type: values.channelType,
                    metadata: {},
                  },
                  topicHint: values.topicHint || undefined,
                })
              : await api.runJob({
                  sourceType: values.sourceType,
                  rawItems: mapContentRawItemsForApi(values.rawItems),
                  publishPolicy: values.publishPolicy,
                  channel: {
                    id: values.channelId,
                    type: values.channelType,
                    metadata: {},
                  },
                  topicHint: values.topicHint || undefined,
                });
            message.success(`Đã tạo job: ${result.jobId}`);
            navigate(`/jobs/${result.jobId}`);
            return true;
          } catch (err) {
            if (err instanceof Error) message.error(err.message);
            return false;
          }
        })
      }
    >
      {trendIdTrimmed ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={
            <span>
              Nguồn từ trend job{" "}
              <Typography.Text copyable={{ text: trendIdTrimmed }} code>
                {trendIdTrimmed.slice(0, 8)}…
              </Typography.Text>
            </span>
          }
          description={
            initialTopicIndex != null
              ? `Đã cố định chỉ số topic (0-based): ${initialTopicIndex}. Chỉ candidate này được đưa vào pipeline nội dung.`
              : "Chưa cố định chỉ số topic — để trống ô «Chỉ số topic» bên dưới sẽ gộp mọi candidate của trend job vào một job nội dung."
          }
        />
      ) : null}
      <ProFormText
        name="trendJobId"
        label="Trend job ID (UUID)"
        fieldProps={{ placeholder: "Để trống nếu nhập raw items bên dưới" }}
      />
      <ProFormDigit
        name="topicIndex"
        label="Chỉ số topic trong trend (tuỳ chọn)"
        fieldProps={{ min: 0, precision: 0, placeholder: "Trống = tất cả candidate → một job gộp" }}
      />
      <ProFormDependency name={["trendJobId"]}>
        {({ trendJobId }) => {
          const locked = typeof trendJobId === "string" && trendJobId.trim().length > 0;
          return (
            <ProFormSelect
              name="sourceType"
              label="Loại nguồn"
              rules={[{ required: !locked }]}
              disabled={locked}
              options={[
                { value: "manual", label: "Thủ công (manual)" },
                { value: "rss", label: "RSS" },
                { value: "webhook", label: "Webhook" },
                { value: "api", label: "API" },
              ]}
            />
          );
        }}
      </ProFormDependency>
      <ProFormSelect
        name="publishPolicy"
        label="Chính sách xuất bản"
        rules={[{ required: true }]}
        options={[
          { value: "review_only", label: "Chỉ khi đã review / duyệt" },
          { value: "auto", label: "Tự động" },
          { value: "manual_only", label: "Chỉ thủ công" },
        ]}
      />
      <ProFormChannelFields />
      <ProFormText
        name="topicHint"
        label="Gợi ý chủ đề (tuỳ chọn)"
        fieldProps={{ placeholder: "vd. AI trong marketing" }}
      />
      <ProFormDependency name={["trendJobId"]}>
        {({ trendJobId }) => {
          const locked = typeof trendJobId === "string" && trendJobId.trim().length > 0;
          if (locked) {
            return (
              <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Đang dùng output của trend job — raw items không gửi lên API.
              </Typography.Paragraph>
            );
          }
          return (
            <ProFormRawItemsList label="Nội dung nguồn">
              <ProFormText name="title" label="Tiêu đề" rules={[{ required: true, message: "Bắt buộc" }]} />
              <ProFormText name="body" label="Nội dung (tuỳ chọn)" />
              <ProFormText name="url" label="URL (tuỳ chọn)" />
            </ProFormRawItemsList>
          );
        }}
      </ProFormDependency>
    </ModalForm>
  );
}
