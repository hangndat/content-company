import { Modal, Form, Input, Select, Button, Space, message } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../api";

type RunJobModalProps = {
  open: boolean;
  onClose: () => void;
};

export function RunJobModal({ open, onClose }: RunJobModalProps) {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const result = await api.runJob({
        sourceType: values.sourceType,
        rawItems: values.rawItems.map((item: { title: string; body?: string; url?: string }) => ({
          title: item.title,
          body: item.body || undefined,
          url: item.url || undefined,
        })),
        publishPolicy: values.publishPolicy,
        channel: {
          id: values.channelId,
          type: values.channelType,
          metadata: {},
        },
        topicHint: values.topicHint || undefined,
      });
      message.success(`Job created: ${result.jobId}`);
      form.resetFields();
      onClose();
      navigate(`/jobs/${result.jobId}`);
    } catch (err) {
      if (err instanceof Error) {
        message.error(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="Run Job"
      open={open}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" loading={submitting} onClick={handleSubmit}>
          Run
        </Button>,
      ]}
      width={560}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          sourceType: "manual",
          publishPolicy: "review_only",
          channelId: "blog-1",
          channelType: "blog",
          rawItems: [{ title: "", body: "" }],
        }}
      >
        <Form.Item name="sourceType" label="Source Type" rules={[{ required: true }]}>
          <Select
            options={[
              { value: "manual", label: "Manual" },
              { value: "rss", label: "RSS" },
              { value: "webhook", label: "Webhook" },
              { value: "api", label: "API" },
            ]}
          />
        </Form.Item>
        <Form.Item name="publishPolicy" label="Publish Policy" rules={[{ required: true }]}>
          <Select
            options={[
              { value: "review_only", label: "Review only (requires approval)" },
              { value: "auto", label: "Auto" },
              { value: "manual_only", label: "Manual only" },
            ]}
          />
        </Form.Item>
        <Form.Item label="Channel">
          <Space.Compact style={{ width: "100%" }}>
            <Form.Item name="channelId" noStyle rules={[{ required: true }]}>
              <Input placeholder="Channel ID (e.g. blog-1)" style={{ width: "50%" }} />
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
        <Form.Item name="topicHint" label="Topic Hint (optional)">
          <Input placeholder="e.g. AI in marketing" />
        </Form.Item>
        <Form.List
          name="rawItems"
          rules={[
            {
              validator: async (_, items) => {
                if (!items || items.length === 0) {
                  throw new Error("At least one item required");
                }
              },
            },
          ]}
        >
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Space key={key} style={{ display: "flex", marginBottom: 8 }} align="baseline">
                  <Form.Item
                    {...restField}
                    name={[name, "title"]}
                    rules={[{ required: true, message: "Title required" }]}
                    style={{ flex: 1, marginBottom: 0, minWidth: 200 }}
                  >
                    <Input placeholder="Title" />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, "body"]} style={{ flex: 1, marginBottom: 0, minWidth: 150 }}>
                    <Input placeholder="Body (optional)" />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, "url"]} style={{ flex: 1, marginBottom: 0, minWidth: 150 }}>
                    <Input placeholder="URL (optional)" />
                  </Form.Item>
                  {fields.length > 1 ? (
                    <Button type="text" danger onClick={() => remove(name)}>
                      Remove
                    </Button>
                  ) : null}
                </Space>
              ))}
              <Form.Item>
                <Button type="dashed" onClick={() => add()} block>
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
