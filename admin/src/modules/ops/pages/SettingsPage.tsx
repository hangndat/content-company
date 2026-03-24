import { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Checkbox,
  message,
  Tag,
  Collapse,
} from "antd";
import { PlusOutlined, CheckOutlined, ReloadOutlined, EyeOutlined, EditOutlined } from "@ant-design/icons";
import { api } from "../../../api";
import { LangfuseObservabilityCard } from "../components/LangfuseObservabilityCard";

type PromptVersion = {
  id: string;
  version: number;
  isActive: boolean;
  createdAt: string;
};

type PromptWithContent = PromptVersion & { content: string };

const PROMPT_TYPES = ["planner", "scorer", "writer", "reviewer"] as const;

export default function SettingsPage() {
  const [promptsByType, setPromptsByType] = useState<Record<string, PromptVersion[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createModal, setCreateModal] = useState<{ type: string; open: boolean }>({ type: "", open: false });
  const [viewModal, setViewModal] = useState<{
    open: boolean;
    type: string;
    version: number;
    content: string;
    isActive: boolean;
  } | null>(null);
  const [loadingView, setLoadingView] = useState(false);
  const [form] = Form.useForm();

  const loadPrompts = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.promptsList();
      setPromptsByType(result as Record<string, PromptVersion[]>);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrompts();
  }, []);

  const handleActivate = async (type: string, version: number) => {
    try {
      await api.activatePrompt(type, { version });
      message.success(`Activated ${type} v${version}`);
      loadPrompts();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to activate");
    }
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await api.createPrompt(createModal.type, {
        content: values.content,
        setActive: values.setActive ?? false,
      });
      message.success(`Created ${createModal.type} v?`);
      form.resetFields();
      setCreateModal({ type: "", open: false });
      loadPrompts();
    } catch (err) {
      if (err instanceof Error && !err.message.includes("validateFields")) {
        message.error(err.message);
      }
    }
  };

  const openCreateModal = (type: string, initialContent?: string) => {
    setCreateModal({ type, open: true });
    form.setFieldsValue({ content: initialContent ?? "", setActive: false });
  };

  const handleView = async (type: string, version: number) => {
    setLoadingView(true);
    try {
      const list = (await api.promptsByType(type)) as PromptWithContent[];
      const item = list.find((p) => p.version === version);
      if (item) {
        setViewModal({
          open: true,
          type,
          version: item.version,
          content: item.content,
          isActive: item.isActive,
        });
      } else {
        message.error("Version not found");
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoadingView(false);
    }
  };

  const handleCreateFromView = () => {
    if (viewModal) {
      openCreateModal(viewModal.type, viewModal.content);
      setViewModal(null);
    }
  };

  const items = PROMPT_TYPES.map((type) => ({
    key: type,
    label: type.charAt(0).toUpperCase() + type.slice(1),
    children: (
      <Table
        size="small"
        dataSource={promptsByType[type] ?? []}
        rowKey="id"
        locale={{ emptyText: "No prompts. Run npm run db:seed to create defaults." }}
        columns={[
          {
            title: "Version",
            dataIndex: "version",
            key: "version",
            width: 80,
          },
          {
            title: "Active",
            dataIndex: "isActive",
            key: "isActive",
            width: 80,
            render: (v: boolean) => (v ? <Tag color="green">Active</Tag> : null),
          },
          {
            title: "Created",
            dataIndex: "createdAt",
            key: "createdAt",
            render: (v: string) => (v ? new Date(v).toLocaleString() : "—"),
          },
          {
            title: "Actions",
            key: "actions",
            width: 180,
            render: (_: unknown, row: PromptVersion) => (
              <>
                <Button
                  size="small"
                  type="link"
                  icon={<EyeOutlined />}
                  onClick={() => handleView(type, row.version)}
                  loading={loadingView}
                >
                  View
                </Button>
                <Button
                  size="small"
                  type="primary"
                  ghost
                  icon={<CheckOutlined />}
                  disabled={row.isActive}
                  onClick={() => handleActivate(type, row.version)}
                >
                  Activate
                </Button>
              </>
            ),
          },
        ]}
        pagination={false}
      />
    ),
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Settings</h2>
        <Button icon={<ReloadOutlined />} onClick={loadPrompts} loading={loading}>
          Refresh
        </Button>
      </div>

      {error && (
        <div style={{ color: "#ff4d4f" }}>{error}</div>
      )}

      <LangfuseObservabilityCard days={7} />

      <Card title="Prompt Versions">
        <p style={{ marginBottom: 16, color: "#666" }}>
          Manage prompt versions for planner, scorer, writer, and reviewer. Click <strong>View</strong> to see content,{" "}
          <strong>Activate</strong> to use a version, or <strong>New version</strong> to create from scratch. Run{" "}
          <code>npm run db:seed</code> if no prompts exist.
        </p>
        <Collapse
          items={items.map((item) => ({
            ...item,
            extra: (
              <Button
                type="link"
                size="small"
                icon={<PlusOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  openCreateModal(item.key);
                }}
              >
                New version
              </Button>
            ),
          }))}
        />
      </Card>

      <Modal
        title={`Create ${createModal.type} prompt`}
        open={createModal.open}
        onCancel={() => setCreateModal({ type: "", open: false })}
        onOk={handleCreate}
        okText="Create"
        width={700}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="content" label="Content" rules={[{ required: true }]}>
            <Input.TextArea rows={12} placeholder="Prompt content..." />
          </Form.Item>
          <Form.Item name="setActive" valuePropName="checked">
            <Checkbox>Set as active immediately</Checkbox>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`View ${viewModal?.type} v${viewModal?.version}${viewModal?.isActive ? " (Active)" : ""}`}
        open={!!viewModal}
        onCancel={() => setViewModal(null)}
        footer={[
          <Button key="close" onClick={() => setViewModal(null)}>
            Close
          </Button>,
          <Button key="edit" type="primary" onClick={handleCreateFromView}>
            <EditOutlined /> Create new version from this
          </Button>,
        ]}
        width={700}
      >
        {viewModal && (
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: 400,
              overflow: "auto",
              padding: 12,
              background: "#f5f5f5",
              borderRadius: 6,
              fontSize: 13,
              fontFamily: "monospace",
            }}
          >
            {viewModal.content}
          </pre>
        )}
      </Modal>
    </div>
  );
}
