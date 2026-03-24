import { Input, Select, Space, Switch } from "antd";

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
  { value: undefined, label: "All" },
  { value: "running", label: "Running" },
  { value: "completed", label: "Completed" },
  { value: "draft", label: "Draft" },
  { value: "paused", label: "Paused" },
];

const NODE_TYPE_OPTIONS = [
  { value: undefined, label: "All" },
  { value: "planner", label: "Planner" },
  { value: "scorer", label: "Scorer" },
  { value: "writer", label: "Writer" },
  { value: "reviewer", label: "Reviewer" },
];

const SCOPE_OPTIONS = [
  { value: undefined, label: "All" },
  { value: "global", label: "Global" },
  { value: "channel", label: "Channel" },
  { value: "topic", label: "Topic" },
  { value: "source_type", label: "Source type" },
];

export function ExperimentFilterBar({
  filters,
  onFiltersChange,
}: ExperimentFilterBarProps) {
  return (
    <Space wrap>
      <span>Status:</span>
      <Select
        value={filters.status}
        onChange={(v) => onFiltersChange({ ...filters, status: v })}
        style={{ width: 140 }}
        options={STATUS_OPTIONS}
      />
      <span>Node type:</span>
      <Select
        value={filters.nodeType}
        onChange={(v) => onFiltersChange({ ...filters, nodeType: v })}
        style={{ width: 120 }}
        options={NODE_TYPE_OPTIONS}
      />
      <span>Scope:</span>
      <Select
        value={filters.scope}
        onChange={(v) => onFiltersChange({ ...filters, scope: v })}
        style={{ width: 130 }}
        options={SCOPE_OPTIONS}
      />
      <Input
        placeholder="Search by name"
        value={filters.search}
        onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
        style={{ width: 180 }}
        allowClear
      />
      <span>Running only:</span>
      <Switch
        checked={filters.runningOnly ?? false}
        onChange={(v) => onFiltersChange({ ...filters, runningOnly: v })}
      />
    </Space>
  );
}
