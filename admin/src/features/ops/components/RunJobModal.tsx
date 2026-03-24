import { useNavigate } from "react-router-dom";
import { App } from "antd";
import { ModalForm, ProFormSelect, ProFormText } from "@ant-design/pro-components";
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
};

export function RunJobModal({ open, onClose }: RunJobModalProps) {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { submitting, guard } = useOpsModalSubmit();

  return (
    <ModalForm
      title="Chạy job nội dung"
      open={open}
      width={560}
      modalProps={opsModalProps(onClose)}
      initialValues={{
        sourceType: "manual",
        publishPolicy: "review_only",
        ...DEFAULT_CHANNEL_FIELDS,
        rawItems: [{ title: "", body: "", url: "" }],
      }}
      onOpenChange={opsModalOpenChange(onClose)}
      submitter={opsModalSubmitter({ submitting, submitText: "Chạy", onClose })}
      onFinish={async (values) =>
        guard(async () => {
          try {
            const result = await api.runJob({
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
      <ProFormSelect
        name="sourceType"
        label="Loại nguồn"
        rules={[{ required: true }]}
        options={[
          { value: "manual", label: "Thủ công (manual)" },
          { value: "rss", label: "RSS" },
          { value: "webhook", label: "Webhook" },
          { value: "api", label: "API" },
        ]}
      />
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
      <ProFormRawItemsList label="Nội dung nguồn">
        <ProFormText name="title" label="Tiêu đề" rules={[{ required: true, message: "Bắt buộc" }]} />
        <ProFormText name="body" label="Nội dung (tuỳ chọn)" />
        <ProFormText name="url" label="URL (tuỳ chọn)" />
      </ProFormRawItemsList>
    </ModalForm>
  );
}
