import { useState, useEffect, useCallback } from "react";
import { App, Table, Button, Modal, Tag } from "antd";
import { ModalForm, ProFormTextArea, ProFormCheckbox } from "@ant-design/pro-components";
import { PlusOutlined, CheckOutlined, ReloadOutlined, EyeOutlined, EditOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";

export type PromptVersionRow = {
  id: string;
  version: number;
  isActive: boolean;
  createdAt: string;
};

type PromptWithContent = PromptVersionRow & { content: string };

interface PromptVersionsPanelProps {
  /** planner | scorer | writer | reviewer */
  promptType: string;
  /** Shown above the table */
  title?: string;
}

export function PromptVersionsPanel({ promptType, title = "Phiên bản prompt" }: PromptVersionsPanelProps) {
  const { message } = App.useApp();
  const [rows, setRows] = useState<PromptVersionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createPromptKey, setCreatePromptKey] = useState(0);
  const [createModal, setCreateModal] = useState<{
    open: boolean;
    draftContent: string;
  }>({ open: false, draftContent: "" });
  const [viewModal, setViewModal] = useState<{
    open: boolean;
    version: number;
    content: string;
    isActive: boolean;
  } | null>(null);
  const [loadingView, setLoadingView] = useState(false);

  const loadPrompts = useCallback(async () => {
    setLoading(true);
    try {
      const result = (await api.promptsList()) as Record<string, PromptVersionRow[]>;
      setRows(result[promptType] ?? []);
    } catch {
      setRows([]);
      message.error("Không tải được danh sách phiên bản.");
    } finally {
      setLoading(false);
    }
  }, [promptType, message]);

  useEffect(() => {
    void loadPrompts();
  }, [loadPrompts]);

  const handleActivate = async (version: number) => {
    try {
      await api.activatePrompt(promptType, { version });
      message.success(`Đã kích hoạt ${promptType} v${version}`);
      await loadPrompts();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Không kích hoạt được.");
    }
  };

  const openCreateModal = async (initialContent?: string) => {
    setCreatePromptKey((k) => k + 1);
    let draft = initialContent;
    if (draft === undefined) {
      try {
        const list = await api.promptsByType(promptType);
        const active = list.find((p) => p.isActive);
        draft = active?.content ?? list[0]?.content ?? "";
      } catch {
        draft = "";
      }
    }
    setCreateModal({ open: true, draftContent: draft ?? "" });
  };

  const handleView = async (version: number) => {
    setLoadingView(true);
    try {
      const list = (await api.promptsByType(promptType)) as PromptWithContent[];
      const item = list.find((p) => p.version === version);
      if (item) {
        setViewModal({
          open: true,
          version: item.version,
          content: item.content,
          isActive: item.isActive,
        });
      } else {
        message.error("Không tìm thấy phiên bản.");
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Không tải được.");
    } finally {
      setLoadingView(false);
    }
  };

  const handleCreateFromView = () => {
    if (viewModal) {
      void openCreateModal(viewModal.content);
      setViewModal(null);
    }
  };

  const closeCreateModal = () => {
    setCreateModal({ open: false, draftContent: "" });
  };

  return (
    <>
      <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong>{title}</strong>
        <Button.Group>
          <Button icon={<ReloadOutlined />} onClick={() => void loadPrompts()} loading={loading} size="small">
            Làm mới
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => void openCreateModal()} size="small">
            Phiên bản mới
          </Button>
        </Button.Group>
      </div>
      <p style={{ marginBottom: 12, color: "#666", fontSize: 13 }}>
        <strong>Xem</strong> nội dung, <strong>Kích hoạt</strong> để pipeline dùng phiên bản đó.{" "}
        <Link to={`/agents/${promptType}/tune`}>Mở phòng thử prompt</Link> để chọn job, xem input, dry-run và chỉnh
        template trên layout riêng. Chưa có dữ liệu thì chạy <code>npm run db:seed</code> ở orchestrator.
      </p>
      <Table
        size="small"
        dataSource={rows}
        rowKey="id"
        loading={loading}
        locale={{ emptyText: "Chưa có prompt." }}
        columns={[
          { title: "Phiên bản", dataIndex: "version", key: "version", width: 90 },
          {
            title: "Đang dùng",
            dataIndex: "isActive",
            key: "isActive",
            width: 100,
            render: (v: boolean) => (v ? <Tag color="green">Đang dùng</Tag> : null),
          },
          {
            title: "Tạo lúc",
            dataIndex: "createdAt",
            key: "createdAt",
            render: (v: string) => (v ? new Date(v).toLocaleString("vi-VN") : "—"),
          },
          {
            title: "Thao tác",
            key: "actions",
            width: 200,
            render: (_: unknown, row: PromptVersionRow) => (
              <>
                <Button
                  size="small"
                  type="link"
                  icon={<EyeOutlined />}
                  onClick={() => void handleView(row.version)}
                  loading={loadingView}
                >
                  Xem
                </Button>
                <Button
                  size="small"
                  type="primary"
                  ghost
                  icon={<CheckOutlined />}
                  disabled={row.isActive}
                  onClick={() => void handleActivate(row.version)}
                >
                  Kích hoạt
                </Button>
              </>
            ),
          },
        ]}
        pagination={false}
      />

      <ModalForm
        key={createPromptKey}
        title={`Tạo phiên bản — ${promptType}`}
        open={createModal.open}
        width={700}
        layout="vertical"
        initialValues={{ content: createModal.draftContent, setActive: false }}
        modalProps={{
          destroyOnClose: true,
          onCancel: closeCreateModal,
          maskClosable: false,
        }}
        onOpenChange={(visible) => {
          if (!visible) closeCreateModal();
        }}
        submitter={{
          searchConfig: { submitText: "Tạo", resetText: "Hủy" },
          resetButtonProps: {
            onClick: closeCreateModal,
          },
        }}
        onFinish={async (values: { content: string; setActive?: boolean }) => {
          try {
            await api.createPrompt(promptType, {
              content: values.content,
              setActive: values.setActive ?? false,
            });
            message.success(`Đã tạo phiên bản prompt ${promptType}`);
            await loadPrompts();
            return true;
          } catch (err) {
            if (err instanceof Error) message.error(err.message);
            return false;
          }
        }}
      >
        <ProFormTextArea
          name="content"
          label="Nội dung"
          rules={[{ required: true, message: "Bắt buộc" }]}
          fieldProps={{ rows: 12, placeholder: "Nội dung prompt…" }}
        />
        <ProFormCheckbox name="setActive">Đặt làm phiên bản đang dùng ngay</ProFormCheckbox>
      </ModalForm>

      <Modal
        title={`Xem ${promptType} v${viewModal?.version}${viewModal?.isActive ? " (đang dùng)" : ""}`}
        open={!!viewModal}
        onCancel={() => setViewModal(null)}
        footer={[
          <Button key="close" onClick={() => setViewModal(null)}>
            Đóng
          </Button>,
          <Button key="edit" type="primary" onClick={handleCreateFromView}>
            <EditOutlined /> Tạo phiên bản mới từ bản này
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
    </>
  );
}
