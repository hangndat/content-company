/**
 * Map status → Ant Design Tag color.
 * Single source of truth for consistent status display.
 */

export type ExperimentStatus = "draft" | "running" | "paused" | "completed";
export type JobStatus = "pending" | "processing" | "completed" | "failed";
export type DecisionStatus = "APPROVED" | "REVIEW_REQUIRED" | "REJECTED";

const STATUS_COLOR_MAP: Record<string, string> = {
  // Experiment
  draft: "default",
  running: "green",
  paused: "orange",
  completed: "blue",
  // Job
  pending: "cyan",
  processing: "blue",
  failed: "red",
  // Decision
  APPROVED: "green",
  REVIEW_REQUIRED: "orange",
  REJECTED: "red",
};

export function getStatusTagColor(
  status: string | ExperimentStatus | JobStatus | DecisionStatus
): string {
  return STATUS_COLOR_MAP[status] ?? "default";
}
