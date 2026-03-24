import { Modal, Form, Input, Select, Button, Space, message, Typography } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../api";

const DOMAIN_OPTIONS = [
  { value: "sports-vn", label: "sports-vn (thể thao VN)" },
  { value: "generic", label: "generic (hostname)" },
];

type RunTrendJobModalProps = {
  open: boolean;
  onClose: () => void;
};

export function RunTrendJobModal({ open, onClose }: RunTrendJobModalProps) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const rawItems = values.rawItems.map(
        (item: { title: string; body?: string; url?: string; sourceId?: string }) => {
          const url = item.url?.trim() || undefined;
          const sourceId = item.sourceId?.trim() || undefined;
          return {
            title: item.title.trim(),
            body: (item.body ?? "").trim(),
            url,
            sourceId,
          };
        }
      );
      const result = await api.runTrendJob({
        domain: values.domain,
        rawItems,
        channel: {
          id: values.channelId,
          type: values.channelType,
          metadata: {},
        },
      });
      message.success(`Trend job: ${result.jobId}`);
      form.resetFields();
      onClose();
      navigate(`/jobs/${result.jobId}`);
    } catch (err) {
      if (err instanceof Error) message.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Run trend job"
      open={open}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" loading={submitting} onClick={handleSubmit}>
          Run trend
        </Button>,
      ]}
      width={760}
      destroyOnClose
    >
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        Mỗi item cần map được nguồn: có <strong>url</strong> (host đã cấu hình trong domain) hoặc nhập{" "}
        <strong>sourceId</strong> (bắt buộc nếu không có url). Body tối thiểu 50 ký tự.
      </Typography.Paragraph>
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          domain: "sports-vn",
          channelId: "blog-1",
          channelType: "blog",
          rawItems: [{ title: "", body: "", url: "", sourceId: "" }],
        }}
      >
        <Form.Item name="domain" label="Domain" rules={[{ required: true }]}>
          <Select options={DOMAIN_OPTIONS} />
        </Form.Item>
        <Form.Item label="Channel">
          <Space.Compact style={{ width: "100%" }}>
            <Form.Item name="channelId" noStyle rules={[{ required: true }]}>
              <Input placeholder="Channel ID" style={{ width: "50%" }} />
            </Form.Item>
            <Form.Item name="channelType" noStyle rules={[{ required: true }]}>
              <Select
                options={[
                  { value: "blog", label: "Blog" },
                  { value: "social", label: "Social" },
                  { value: "affiliate", label: "Affiliate" },
                ]}
                style={{ width: "50%" }}
              />
            </Form.Item>
          </Space.Compact>
        </Form.Item>
        <Form.List
          name="rawItems"
          rules={[
            {
              validator: async (_, items) => {
                if (!items?.length) throw new Error("At least one item required");
              },
            },
          ]}
        >
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Space key={key} style={{ display: "flex", flexWrap: "wrap", marginBottom: 8 }} align="baseline">
                  <Form.Item
                    {...restField}
                    name={[name, "title"]}
                    rules={[{ required: true, message: "Title required" }]}
                    style={{ flex: "1 1 200px", marginBottom: 0 }}
                  >
                    <Input placeholder="Title" />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, "body"]}
                    rules={[
                      { required: true, message: "Body required" },
                      { min: 50, message: "Body min 50 chars" },
                    ]}
                    style={{ flex: "1 1 200px", marginBottom: 0 }}
                  >
                    <Input.TextArea placeholder="Body (min 50)" rows={2} />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, "url"]} style={{ flex: "1 1 180px", marginBottom: 0 }}>
                    <Input placeholder="URL (optional)" />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, "sourceId"]}
                    dependencies={[["rawItems", name, "url"]]}
                    rules={[
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          const url = getFieldValue(["rawItems", name, "url"])?.trim();
                          const sid = value?.trim();
                          if (!url && !sid) {
                            return Promise.reject(new Error("sourceId required if no URL"));
                          }
                          return Promise.resolve();
                        },
                      }),
                    ]}
                    style={{ flex: "0 1 140px", marginBottom: 0 }}
                  >
                    <Input placeholder="sourceId" />
                  </Form.Item>
                  {fields.length > 1 ? (
                    <Button type="text" danger onClick={() => remove(name)}>
                      Remove
                    </Button>
                  ) : null}
                </Space>
              ))}
              <Form.Item>
                <Button type="dashed" onClick={() => add({ title: "", body: "", url: "", sourceId: "" })} block>
                  + Add item
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}
