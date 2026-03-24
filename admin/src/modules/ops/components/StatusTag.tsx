import { Tag } from "antd";
import { getStatusTagColor } from "../../../shared/constants/status";
import type { ExperimentStatus, JobStatus, DecisionStatus } from "../../../shared/constants/status";

interface StatusTagProps {
  status: string | ExperimentStatus | JobStatus | DecisionStatus;
}

export function StatusTag({ status }: StatusTagProps) {
  const color = getStatusTagColor(status);
  const display = String(status).replace(/_/g, " ").toLowerCase();
  return <Tag color={color}>{display}</Tag>;
}
