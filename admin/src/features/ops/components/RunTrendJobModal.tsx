import { useNavigate } from "react-router-dom";
import { App, Typography } from "antd";
import {
  ModalForm,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
  ProFormDependency,
} from "@ant-design/pro-components";
import { api } from "@/lib/api";
import {
  DEFAULT_CHANNEL_FIELDS,
  TREND_DOMAIN_OPTIONS,
} from "@/features/ops/constants/jobRunForm";
import { ProFormChannelFields } from "./ProFormChannelFields";
import { ProFormRawItemsList } from "./ProFormRawItemsList";
import { useOpsModalSubmit } from "@/features/ops/hooks/useOpsModalSubmit";
import { mapTrendRawItemsForApi } from "@/features/ops/utils/mapRunJobPayload";
import { opsModalOpenChange, opsModalProps, opsModalSubmitter } from "@/features/ops/utils/opsModalForm";

type RunTrendJobModalProps = {
  open: boolean;
  onClose: () => void;
};

export function RunTrendJobModal({ open, onClose }: RunTrendJobModalProps) {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { submitting, guard } = useOpsModalSubmit();

  return (
    <ModalForm
      title="Chạy job trend"
      open={open}
      width={760}
      modalProps={opsModalProps(onClose)}
      initialValues={{
        domain: "sports-vn",
        skipArticleDedup: false,
        ...DEFAULT_CHANNEL_FIELDS,
        rawItems: [{ title: "", body: "", url: "", sourceId: "" }],
      }}
      onOpenChange={opsModalOpenChange(onClose)}
      submitter={opsModalSubmitter({ submitting, submitText: "Chạy trend", onClose })}
      onFinish={async (values) =>
        guard(async () => {
          try {
            const result = await api.runTrendJob({
              domain: values.domain,
              skipArticleDedup: Boolean(values.skipArticleDedup),
              rawItems: mapTrendRawItemsForApi(values.rawItems),
              channel: {
                id: values.channelId,
                type: values.channelType,
                metadata: {},
              },
            });
            message.success(`Đã tạo trend job: ${result.jobId}`);
            navigate(`/jobs/${result.jobId}`);
            return true;
          } catch (err) {
            if (err instanceof Error) message.error(err.message);
            return false;
          }
        })
      }
    >
      <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
        Mỗi item cần map được nguồn: có <strong>url</strong> (host đã cấu hình trong domain) hoặc nhập{" "}
        <strong>sourceId</strong> (bắt buộc nếu không có url). Body tối thiểu 50 ký tự.
      </Typography.Paragraph>
      <ProFormSelect
        name="domain"
        label="Domain"
        rules={[{ required: true }]}
        options={[...TREND_DOMAIN_OPTIONS]}
      />
      <ProFormSwitch
        name="skipArticleDedup"
        label="Bỏ lọc bài đã crawl (dedup)"
        tooltip="Khi bật: đưa toàn bộ bài vào trend dù đã chạy trend gần đây (theo DB crawled_article)."
      />
      <ProFormChannelFields channelIdPlaceholder="Channel ID" />
      <ProFormRawItemsList label="Bài gốc / nguồn tin">
        <ProFormText name="title" label="Tiêu đề" rules={[{ required: true, message: "Bắt buộc" }]} />
        <ProFormTextArea
          name="body"
          label="Nội dung"
          rules={[
            { required: true, message: "Bắt buộc" },
            { min: 50, message: "Tối thiểu 50 ký tự" },
          ]}
          fieldProps={{ rows: 2, placeholder: "Tối thiểu 50 ký tự" }}
        />
        <ProFormText name="url" label="URL (tuỳ chọn)" fieldProps={{ placeholder: "https://…" }} />
        <ProFormDependency name={["url"]}>
          {({ url }) => (
            <ProFormText
              name="sourceId"
              label="sourceId"
              fieldProps={{ placeholder: "Bắt buộc nếu không có URL" }}
              rules={[
                {
                  validator: (_rule, value) => {
                    const u = typeof url === "string" ? url.trim() : "";
                    const sid = typeof value === "string" ? value.trim() : "";
                    if (!u && !sid) {
                      return Promise.reject(new Error("Cần URL hoặc sourceId"));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            />
          )}
        </ProFormDependency>
      </ProFormRawItemsList>
    </ModalForm>
  );
}
