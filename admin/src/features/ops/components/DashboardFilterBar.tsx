import { useEffect } from "react";
import { Button, Card, Form, Space } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import {
  ProForm,
  ProFormSelect,
  ProFormDateRangePicker,
} from "@ant-design/pro-components";

export interface DashboardFilters {
  days?: number;
  from?: string;
  to?: string;
  granularity?: "day" | "hour";
}

interface DashboardFilterBarProps {
  filters: DashboardFilters;
  onFiltersChange: (f: DashboardFilters) => void;
  onRefresh: () => void;
  loading?: boolean;
}

const DAY_OPTIONS = [
  { value: 1, label: "Hôm nay" },
  { value: 7, label: "7 ngày" },
  { value: 14, label: "14 ngày" },
  { value: 30, label: "30 ngày" },
];

type FilterFormValues = {
  days: number;
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs] | null;
};

export function DashboardFilterBar({
  filters,
  onFiltersChange,
  onRefresh,
  loading,
}: DashboardFilterBarProps) {
  const [form] = Form.useForm<FilterFormValues>();

  useEffect(() => {
    form.setFieldsValue({
      days: filters.days ?? 7,
      dateRange:
        filters.from && filters.to ? [dayjs(filters.from), dayjs(filters.to)] : undefined,
    });
  }, [filters.days, filters.from, filters.to, form]);

  const handleValuesChange = (
    _changed: Partial<FilterFormValues>,
    all: FilterFormValues
  ) => {
    const next: DashboardFilters = {
      ...filters,
      days: all.days,
    };
    const dr = all.dateRange;
    if (dr?.[0] && dr?.[1]) {
      next.from = dr[0].format("YYYY-MM-DD");
      next.to = dr[1].format("YYYY-MM-DD");
    } else {
      next.from = undefined;
      next.to = undefined;
    }
    onFiltersChange(next);
  };

  return (
    <Card size="small" styles={{ body: { paddingBlock: 12 } }}>
      <Space wrap size={[12, 8]} align="end">
        <ProForm<FilterFormValues>
          form={form}
          layout="inline"
          submitter={false}
          onValuesChange={handleValuesChange}
          style={{ display: "flex", flexWrap: "wrap", rowGap: 8, columnGap: 12 }}
        >
          <ProFormSelect
            name="days"
            label="Cửa sổ thời gian"
            options={DAY_OPTIONS}
            fieldProps={{ style: { minWidth: 120 } }}
            allowClear={false}
          />
          <ProFormDateRangePicker
            name="dateRange"
            label="Từ / đến"
            fieldProps={{ allowClear: true }}
          />
        </ProForm>
        <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
          Làm mới dữ liệu
        </Button>
      </Space>
    </Card>
  );
}
