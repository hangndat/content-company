import { Form } from "antd";
import { useEffect } from "react";
import { ProForm, ProFormSelect, ProFormText, ProFormSwitch } from "@ant-design/pro-components";

export interface ExperimentFilters {
  status?: string;
  nodeType?: string;
  scope?: string;
  search?: string;
  runningOnly?: boolean;
}

interface ExperimentFilterBarProps {
  filters: ExperimentFilters;
  onFiltersChange: (f: ExperimentFilters) => void;
}

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "running", label: "Đang chạy" },
  { value: "completed", label: "Hoàn thành" },
  { value: "draft", label: "Bản nháp" },
  { value: "paused", label: "Tạm dừng" },
];

const NODE_TYPE_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "planner", label: "Planner" },
  { value: "scorer", label: "Scorer" },
  { value: "writer", label: "Writer" },
  { value: "reviewer", label: "Reviewer" },
];

const SCOPE_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "global", label: "Global" },
  { value: "channel", label: "Channel" },
  { value: "topic", label: "Topic" },
  { value: "source_type", label: "Source type" },
];

type FormValues = {
  status: string;
  nodeType: string;
  scope: string;
  search?: string;
  runningOnly: boolean;
};

export function ExperimentFilterBar({ filters, onFiltersChange }: ExperimentFilterBarProps) {
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    form.setFieldsValue({
      status: filters.status ?? "",
      nodeType: filters.nodeType ?? "",
      scope: filters.scope ?? "",
      search: filters.search,
      runningOnly: filters.runningOnly ?? false,
    });
  }, [filters.status, filters.nodeType, filters.scope, filters.search, filters.runningOnly, form]);

  return (
    <ProForm<FormValues>
      form={form}
      layout="inline"
      submitter={false}
      onValuesChange={(_c, all) => {
        onFiltersChange({
          status: all.status || undefined,
          nodeType: all.nodeType || undefined,
          scope: all.scope || undefined,
          search: all.search,
          runningOnly: all.runningOnly,
        });
      }}
      style={{ rowGap: 8, columnGap: 12 }}
    >
      <ProFormSelect name="status" label="Trạng thái" options={STATUS_OPTIONS} fieldProps={{ style: { minWidth: 140 } }} />
      <ProFormSelect name="nodeType" label="Node" options={NODE_TYPE_OPTIONS} fieldProps={{ style: { minWidth: 130 } }} />
      <ProFormSelect name="scope" label="Scope" options={SCOPE_OPTIONS} fieldProps={{ style: { minWidth: 140 } }} />
      <ProFormText
        name="search"
        label="Tìm theo tên"
        fieldProps={{ placeholder: "Tên thử nghiệm…", allowClear: true, style: { width: 200 } }}
      />
      <ProFormSwitch name="runningOnly" label="Chỉ đang chạy" />
    </ProForm>
  );
}
