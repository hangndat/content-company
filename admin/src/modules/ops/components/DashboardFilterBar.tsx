import { Button, DatePicker, Select, Space } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

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
  { value: 1, label: "Today" },
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
];

export function DashboardFilterBar({
  filters,
  onFiltersChange,
  onRefresh,
  loading,
}: DashboardFilterBarProps) {
  return (
    <Space wrap>
      <span>Days:</span>
      <Select
        value={filters.days ?? 7}
        onChange={(v) => onFiltersChange({ ...filters, days: v })}
        style={{ width: 120 }}
        options={DAY_OPTIONS}
      />
      <span>From/To (optional):</span>
      <RangePicker
        value={
          filters.from && filters.to
            ? [dayjs(filters.from), dayjs(filters.to)]
            : null
        }
        onChange={(dates) => {
          if (dates && dates[0] && dates[1]) {
            onFiltersChange({
              ...filters,
              from: dates[0].format("YYYY-MM-DD"),
              to: dates[1].format("YYYY-MM-DD"),
            });
          } else {
            onFiltersChange({ ...filters, from: undefined, to: undefined });
          }
        }}
      />
      <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
        Refresh
      </Button>
    </Space>
  );
}
